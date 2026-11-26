-- 온라인 필사 — 비회원도 타수 랭킹에 오르기
-- 작성일: 2026-11-26
--
-- 결정 (HJ, 2026-11-26, A안):
--   - 비회원도 닉네임 + 타수만으로 "타수" 탭에 오른다. "꾸준함"(이번 주 쪽 수)은 회원만.
--   - 회원 표(typing_records)·auth 는 건드리지 않고 비회원 전용 표를 따로 둔다.
--   - 순위표에는 회원과 같이 닉네임 첫 글자만 보이고("책**"), 작은 "비회원" 표시가 붙는다.
--
-- 비회원은 "한 사람"이라는 증거(계정)가 없으므로 다음으로 막는다:
--   1) 가짜 타수 — 서버 액션이 서명한 시작 토큰으로 "서버 시계" 경과 시간을 재서,
--      그 시간에 칠 수 있는 최대 타수를 넘는 기록은 받지 않는다(앱). 여기서도 40ms/글자를 한 번 더 본다.
--   2) 도배 — 같은 IP(해시)에서 하루에 새 비회원은 3명까지. 분당 횟수는 앱이 increment_rate_limit 으로 센다.
--   3) 닉네임 — 2~10자, 한글·영문·숫자만(앱에서 금칙어도 거른다). 남에게는 첫 글자만 보인다.
--
-- 이 표는 누구도 직접 읽고 쓰지 못한다(RLS 켜고 정책 없음, 권한 회수).
-- 쓰기는 service_role 만 부를 수 있는 record_typing_guest_page() 로만, 읽기는 get_typing_ranking() 으로만.

-- =====================================================
-- 1. 비회원 기록 — (비회원 쿠키 id, 작품, 쪽) 마다 한 줄, 최고 타수만 남긴다
-- =====================================================
CREATE TABLE IF NOT EXISTS public.typing_guest_scores (
  -- 브라우저 쿠키에 담긴 무작위 id(httpOnly). 계정이 아니므로 auth.users 를 참조하지 않는다
  guest_id uuid NOT NULL,
  work text NOT NULL CHECK (work IN ('little-prince')),
  page_key text NOT NULL CHECK (page_key ~ '^([0-9]{1,2}-[0-9]{1,3}|f:[a-z0-9-]{1,40})$'),
  nickname text NOT NULL CHECK (
    char_length(nickname) BETWEEN 2 AND 10
    AND nickname ~ '^[가-힣a-zA-Z0-9]+$'
  ),
  chars integer NOT NULL CHECK (chars BETWEEN 1 AND 2000),
  -- 정확도 95% 이상으로 쓴 최고 타수 — 95% 미만은 받지 않는다(회원 타수 순위와 같은 기준)
  best_cpm integer NOT NULL CHECK (best_cpm BETWEEN 1 AND 1500),
  accuracy integer NOT NULL CHECK (accuracy BETWEEN 95 AND 100),
  duration_ms integer NOT NULL CHECK (duration_ms BETWEEN 1000 AND 3600000),
  -- IP 그대로가 아니라 서버 비밀값을 섞은 해시(sha256 hex) — 도배 제한에만 쓴다
  ip_hash text NOT NULL CHECK (ip_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guest_id, work, page_key)
);

-- 하루 새 비회원 수 제한: 같은 IP 해시의 최근 줄을 훑는다
CREATE INDEX IF NOT EXISTS typing_guest_scores_ip_created_idx
  ON public.typing_guest_scores (ip_hash, created_at DESC);
-- 타수 순위
CREATE INDEX IF NOT EXISTS typing_guest_scores_work_cpm_idx
  ON public.typing_guest_scores (work, best_cpm DESC);

ALTER TABLE public.typing_guest_scores ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.typing_guest_scores FROM PUBLIC, anon, authenticated;

-- =====================================================
-- 2. 비회원이 한 쪽 다 썼다 — 서버(service_role)만 부른다
-- =====================================================
-- 왜 service_role 전용인가: 비회원은 auth.uid() 가 없어 DB가 "누구인지" 확인할 수 없다.
-- 시작 토큰 검증·레이트 리밋·닉네임 금칙어는 서버 액션이 하고, 통과한 것만 여기로 온다.
-- anon 에 열어 두면 공개 anon 키로 REST rpc 를 직접 불러 이 검사들을 건너뛸 수 있다.
CREATE OR REPLACE FUNCTION public.record_typing_guest_page(
  p_guest_id uuid,
  p_ip_hash text,
  p_nickname text,
  p_work text,
  p_page_key text,
  p_chars integer,
  p_cpm integer,
  p_accuracy integer,
  p_duration_ms integer
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nickname text := btrim(p_nickname);
  v_other_guests integer;
BEGIN
  IF p_accuracy < 95 THEN
    RAISE EXCEPTION 'accuracy too low' USING ERRCODE = '22023';
  END IF;
  -- 한 글자에 최소 40ms(분당 1500자)
  IF p_duration_ms < p_chars * 40 THEN
    RAISE EXCEPTION 'too fast' USING ERRCODE = '22023';
  END IF;

  -- 같은 IP 에서 오늘(최근 24시간) 새로 생긴 다른 비회원이 3명 이상이면 받지 않는다.
  -- 이미 기록이 있는 비회원(쿠키 그대로)은 계속 쓸 수 있다.
  IF NOT EXISTS (
    SELECT 1 FROM public.typing_guest_scores WHERE guest_id = p_guest_id
  ) THEN
    SELECT count(DISTINCT guest_id) INTO v_other_guests
    FROM public.typing_guest_scores
    WHERE ip_hash = p_ip_hash
      AND created_at >= now() - interval '24 hours';
    IF v_other_guests >= 3 THEN
      RAISE EXCEPTION 'too many guests' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO public.typing_guest_scores AS g
    (guest_id, work, page_key, nickname, chars, best_cpm, accuracy, duration_ms, ip_hash)
  VALUES
    (p_guest_id, p_work, p_page_key, v_nickname, p_chars, p_cpm, p_accuracy, p_duration_ms, p_ip_hash)
  ON CONFLICT (guest_id, work, page_key) DO UPDATE SET
    -- 더 빠를 때만 기록을 바꾼다
    best_cpm = GREATEST(g.best_cpm, EXCLUDED.best_cpm),
    accuracy = CASE WHEN EXCLUDED.best_cpm > g.best_cpm THEN EXCLUDED.accuracy ELSE g.accuracy END,
    duration_ms = CASE WHEN EXCLUDED.best_cpm > g.best_cpm THEN EXCLUDED.duration_ms ELSE g.duration_ms END,
    nickname = EXCLUDED.nickname,
    ip_hash = EXCLUDED.ip_hash,
    updated_at = now();

  -- 닉네임은 사람(쿠키)마다 하나 — 바꾸면 이 사람의 다른 쪽 기록도 같이 바꾼다
  UPDATE public.typing_guest_scores
  SET nickname = v_nickname
  WHERE guest_id = p_guest_id AND nickname <> v_nickname;
END;
$$;

REVOKE ALL ON FUNCTION public.record_typing_guest_page(uuid, text, text, text, text, integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_typing_guest_page(uuid, text, text, text, text, integer, integer, integer, integer) TO service_role;

-- =====================================================
-- 3. 랭킹 — 타수 탭에 비회원을 섞는다
-- =====================================================
-- 돌려주는 칸(is_guest·page_key)과 인자(p_guest_id)가 바뀌므로 CREATE OR REPLACE 로는 안 된다
-- (인자가 다르면 같은 이름의 함수가 하나 더 생겨 호출이 모호해진다) → 지우고 다시 만든다.
DROP FUNCTION IF EXISTS public.get_typing_ranking(text, text, integer);

-- p_guest_id: 보는 사람이 비회원이면 그 쿠키 id — 자기 줄에 "(나)"·닉네임 그대로 보이게.
-- 쿠키 id 는 무작위 uuid 라 남이 맞힐 수 없다. 넘겨도 돌려주는 것은 그 사람 자신의 닉네임뿐이다.
CREATE OR REPLACE FUNCTION public.get_typing_ranking(
  p_work text,
  p_board text,
  p_limit integer DEFAULT 100,
  p_guest_id uuid DEFAULT NULL
)
RETURNS TABLE (
  nickname text,
  is_me boolean,
  is_guest boolean,
  value integer,
  page_key text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH week_start AS (
    SELECT (date_trunc('week', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul') AS ts
  ),
  -- 타수: 사람마다 최고 타수 한 줄 + 그 기록을 낸 쪽(page_key) — 랭킹에 "어느 쪽을 쳤는지" 보여 준다(HJ 2026-11-26)
  member_speed AS (
    SELECT DISTINCT ON (r.user_id) r.user_id, r.best_cpm AS value, r.page_key
    FROM public.typing_records r
    WHERE p_board = 'speed' AND r.work = p_work AND r.best_cpm IS NOT NULL
    ORDER BY r.user_id, r.best_cpm DESC, r.completed_at DESC
  ),
  -- 꾸준함: 이번 주 끝까지 쓴 쪽 수(쪽 하나를 가리키지 않으므로 page_key 없음)
  member_steady AS (
    SELECT r.user_id,
      count(*) FILTER (WHERE r.completed_at >= (SELECT ts FROM week_start))::integer AS value,
      NULL::text AS page_key
    FROM public.typing_records r
    WHERE p_board <> 'speed' AND r.work = p_work
    GROUP BY r.user_id
  ),
  member_scores AS (
    SELECT * FROM member_speed
    UNION ALL
    SELECT * FROM member_steady
  ),
  members AS (
    SELECT
      n.name,
      COALESCE(s.user_id = auth.uid(), false) AS is_me,
      false AS is_guest,
      s.value,
      s.page_key,
      s.user_id::text AS tie
    FROM member_scores s
    JOIN public.profiles p ON p.id = s.user_id
    CROSS JOIN LATERAL (
      SELECT COALESCE(NULLIF(btrim(p.nickname), ''), '독자') AS name
    ) n
    WHERE p.typing_rank_opt_in
      AND NOT COALESCE(p.is_test, false)
      AND s.value IS NOT NULL
      AND s.value > 0
  ),
  -- 비회원은 타수 탭에만. 사람(쿠키)마다 최고 타수 한 줄(닉네임은 기록 함수가 사람마다 하나로 맞춘다)
  guests AS (
    SELECT DISTINCT ON (g.guest_id)
      g.nickname AS name,
      COALESCE(g.guest_id = p_guest_id, false) AS is_me,
      true AS is_guest,
      g.best_cpm AS value,
      g.page_key,
      g.guest_id::text AS tie
    FROM public.typing_guest_scores g
    WHERE p_board = 'speed' AND g.work = p_work
    ORDER BY g.guest_id, g.best_cpm DESC, g.updated_at DESC
  ),
  everyone AS (
    SELECT * FROM members
    UNION ALL
    SELECT * FROM guests
  )
  -- 남의 닉네임은 첫 글자만 보이고 나머지는 *(최대 4개)로 가려서 내보낸다(누구나 부르는 함수라 DB에서 가린다).
  -- 내 줄만 닉네임 그대로 + is_me. user_id·쿠키 id·아이디(username)는 내보내지 않는다.
  SELECT
    CASE WHEN e.is_me THEN e.name
      ELSE left(e.name, 1) || repeat('*', LEAST(GREATEST(char_length(e.name) - 1, 1), 4))
    END AS nickname,
    e.is_me,
    e.is_guest,
    e.value,
    e.page_key
  FROM everyone e
  ORDER BY e.value DESC, e.tie
  LIMIT LEAST(GREATEST(p_limit, 1), 200);
$$;

REVOKE ALL ON FUNCTION public.get_typing_ranking(text, text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_typing_ranking(text, text, integer, uuid) TO anon, authenticated;
