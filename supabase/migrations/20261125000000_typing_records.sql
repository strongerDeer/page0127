-- 온라인 필사(타자 필사) 기록 + 랭킹
-- 작성일: 2026-11-25
--
-- 결정 (HJ, 2026-11-25):
--   - /typing/little-prince — 『어린 왕자』 전문(장별로 차례로 공개)·장 고르기·명문장만, 세 가지 방식.
--   - 기록은 로그인한 계정만 남는다. 비회원은 쳐 볼 수만 있다.
--   - 저장 방식 A안: "다 쓴 쪽마다 한 줄". 진행도·이번 주 순위·타수 순위를 모두 이 표 하나로 계산한다.
--   - 랭킹은 탭 두 개: 꾸준함(이번 주 끝까지 쓴 쪽 수) / 타수(정확도 95% 이상으로 쓴 쪽의 최고 평균 타수).
--   - 순위에는 참여를 켠 사람만 닉네임으로 나온다(기본 꺼짐).
--
-- 왜 (사용자, 작품, 쪽) 이 기본 키인가:
--   같은 쪽을 여러 번 써도 한 줄이다. 다시 쓰면 "마지막으로 쓴 때"만 이번 주로 옮겨지고,
--   최고 타수는 더 좋을 때만 바뀐다 → 같은 쪽을 반복해서 이번 주 쪽 수를 부풀릴 수 없다.
--
-- 본문은 DB 에 두지 않는다(코드 파일 src/entities/typing/content). 여기에는 "어느 쪽을 다 썼는지"만 있다.

-- =====================================================
-- 1. 주소 예약어 — /typing 이 생겼으므로 'typing' 을 아이디로 못 쓰게 한다
--    (TS RESERVED_USERNAMES 와 같아야 한다 — reservedRoutes.test.ts 가 확인)
-- =====================================================
CREATE OR REPLACE FUNCTION is_reserved_username(candidate text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(candidate) = ANY (ARRAY[
    -- 실제 라우트 (app/ 최상위 세그먼트, route group 은 벗긴 이름)
    'admin', 'api', 'auth', 'login', 'logout', 'settings',
    'books', 'dashboard', 'feed', 'notifications', 'search',
    'about', 'contact', 'privacy', 'terms',
    'updates', 'onboarding', 'library', 'icons', 'demo', 'sentence', 'typing',
    -- public/ 폴더 — /[username]/... 하위 주소와 겹칠 수 있다
    'badges', 'brand', 'images', 'illustrations',
    -- Next.js 파일 규칙이 만드는 최상위 경로
    'sitemap', 'sitemap.xml', 'robots', 'robots.txt',
    'opengraph-image', 'icon', 'favicon', 'favicon.ico',
    '_next', 'static', 'public', 'well-known', 'manifest', 'offline',
    -- 아직 없지만 만들면 충돌하는 것들 — 미리 잡아둔다
    'help', 'support', 'blog', 'pricing', 'signup', 'register',
    'me', 'new', 'edit', 'delete', 'account', 'profile', 'user', 'users',
    'home', 'explore',
    'null', 'undefined', 'page0127'
  ]);
$$;

-- 이미 'typing' 을 쓰는 사람이 있으면 임시 이름으로 바꾼다(운영엔 없을 것으로 본다)
UPDATE profiles
SET username = 'reader' || substr(md5(id::text), 1, 8)
WHERE is_reserved_username(username);

REVOKE ALL ON FUNCTION is_reserved_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_reserved_username(text) TO anon, authenticated, service_role;

-- =====================================================
-- 2. 순위 참여 — 기본 꺼짐. 켠 사람만 랭킹에 닉네임이 보인다
-- =====================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS typing_rank_opt_in boolean NOT NULL DEFAULT false;

-- =====================================================
-- 3. 다 쓴 쪽 기록
-- =====================================================
CREATE TABLE IF NOT EXISTS public.typing_records (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 작품 — 지금은 어린 왕자 하나. 다른 작품이 생기면 이 목록을 넓힌다
  work text NOT NULL CHECK (work IN ('little-prince')),
  -- 쪽 열쇠: 전문은 '장-쪽'(예: '2-10'), 명문장은 'f:아이디'(예: 'f:fox-secret')
  page_key text NOT NULL CHECK (page_key ~ '^([0-9]{1,2}-[0-9]{1,3}|f:[a-z0-9-]{1,40})$'),
  chars integer NOT NULL CHECK (chars BETWEEN 1 AND 2000),
  -- 마지막으로 쓴 기록
  cpm integer NOT NULL CHECK (cpm BETWEEN 0 AND 1500),
  accuracy integer NOT NULL CHECK (accuracy BETWEEN 0 AND 100),
  duration_ms integer NOT NULL CHECK (duration_ms BETWEEN 1000 AND 3600000),
  -- 정확도 95% 이상으로 썼을 때의 최고 타수(없으면 NULL) — 타수 순위에 쓴다
  best_cpm integer CHECK (best_cpm IS NULL OR best_cpm BETWEEN 0 AND 1500),
  first_completed_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, work, page_key)
);

-- 이번 주 순위: 작품별로 최근 기록을 훑는다
CREATE INDEX IF NOT EXISTS typing_records_work_completed_idx
  ON public.typing_records (work, completed_at DESC);

ALTER TABLE public.typing_records ENABLE ROW LEVEL SECURITY;

-- 내 기록만 읽는다. 쓰기 정책은 없다 — 기록은 아래 record_typing_page() 로만 생긴다.
DROP POLICY IF EXISTS "Users read own typing records" ON public.typing_records;
CREATE POLICY "Users read own typing records" ON public.typing_records
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

GRANT SELECT ON public.typing_records TO authenticated;

-- =====================================================
-- 4. 한 쪽 다 썼다 — 기록 남기기
-- =====================================================
-- SECURITY DEFINER 인 이유: 사용자에게 표 쓰기 권한을 주지 않고, 이 함수의 검사를 거친 기록만 남기려고.
-- 말이 안 되는 기록(1초에 수백 자, 1500타 초과)은 CHECK 와 아래 검사가 거른다 — 랭킹 공정성.
CREATE OR REPLACE FUNCTION public.record_typing_page(
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
  v_user uuid := auth.uid();
  v_best integer := CASE WHEN p_accuracy >= 95 THEN p_cpm ELSE NULL END;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'login required' USING ERRCODE = '42501';
  END IF;
  -- 한 글자에 최소 40ms(분당 1500자) — 붙여넣기·자동 입력 같은 기록은 받지 않는다
  IF p_duration_ms < p_chars * 40 THEN
    RAISE EXCEPTION 'too fast' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.typing_records AS r
    (user_id, work, page_key, chars, cpm, accuracy, duration_ms, best_cpm)
  VALUES
    (v_user, p_work, p_page_key, p_chars, p_cpm, p_accuracy, p_duration_ms, v_best)
  ON CONFLICT (user_id, work, page_key) DO UPDATE SET
    chars = EXCLUDED.chars,
    cpm = EXCLUDED.cpm,
    accuracy = EXCLUDED.accuracy,
    duration_ms = EXCLUDED.duration_ms,
    best_cpm = CASE
      WHEN EXCLUDED.best_cpm IS NULL THEN r.best_cpm
      WHEN r.best_cpm IS NULL THEN EXCLUDED.best_cpm
      ELSE GREATEST(r.best_cpm, EXCLUDED.best_cpm)
    END,
    completed_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.record_typing_page(text, text, integer, integer, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_typing_page(text, text, integer, integer, integer, integer) TO authenticated;

-- =====================================================
-- 5. 랭킹 — 참여를 켠 사람만, 테스트 계정 제외
-- =====================================================
-- p_board: 'steady' = 이번 주(월요일 0시 KST부터) 끝까지 쓴 쪽 수 / 'speed' = 최고 타수
-- 다른 사람 기록은 RLS 로 못 읽으므로 SECURITY DEFINER 로 "닉네임·값"만 내준다.
-- 비회원도 볼 수 있다(닉네임은 본인이 공개를 켠 것).
CREATE OR REPLACE FUNCTION public.get_typing_ranking(
  p_work text,
  p_board text,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  nickname text,
  is_me boolean,
  value integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH week_start AS (
    SELECT (date_trunc('week', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul') AS ts
  ),
  scores AS (
    SELECT r.user_id,
      CASE WHEN p_board = 'speed'
        THEN max(r.best_cpm)
        ELSE count(*) FILTER (WHERE r.completed_at >= (SELECT ts FROM week_start))::integer
      END AS value
    FROM public.typing_records r
    WHERE r.work = p_work
    GROUP BY r.user_id
  )
  -- 남의 닉네임은 첫 글자만 보이고 나머지는 *(최대 4개)로 가려서 내보낸다(누구나 부르는 함수라 DB에서 가린다).
  -- 내 줄만 닉네임 그대로 + is_me. user_id·아이디(username)는 내보내지 않는다.
  SELECT
    CASE WHEN s.user_id = auth.uid() THEN n.name
      ELSE left(n.name, 1) || repeat('*', LEAST(GREATEST(char_length(n.name) - 1, 1), 4))
    END AS nickname,
    COALESCE(s.user_id = auth.uid(), false) AS is_me,
    s.value
  FROM scores s
  JOIN public.profiles p ON p.id = s.user_id
  CROSS JOIN LATERAL (
    SELECT COALESCE(NULLIF(btrim(p.nickname), ''), '독자') AS name
  ) n
  WHERE p.typing_rank_opt_in
    AND NOT COALESCE(p.is_test, false)
    AND s.value IS NOT NULL
    AND s.value > 0
  ORDER BY s.value DESC, s.user_id
  LIMIT LEAST(GREATEST(p_limit, 1), 200);
$$;

REVOKE ALL ON FUNCTION public.get_typing_ranking(text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_typing_ranking(text, text, integer) TO anon, authenticated;

-- =====================================================
-- 6. 순위 참여 켜기/끄기 — 내 프로필의 이 칸만 바꾼다
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_typing_rank_opt_in(p_on boolean)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'login required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles SET typing_rank_opt_in = p_on WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.set_typing_rank_opt_in(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_typing_rank_opt_in(boolean) TO authenticated;
