-- 오늘의 문장 — 운영자가 고른 문장 풀에서 하루 한 문장을 뽑는다
-- 작성일: 2026-11-09
--
-- 결정 (HJ, 2026-11-09):
--   - 뽑기 풀은 운영자(HJ)가 어드민에서 올린 문장만 쓴다. 사용자가 적은 책 문장(book_quotes)과는 별개.
--   - 펼치는 순간 자동으로 기록된다("기록에 저장" 버튼 없음). 공유 버튼만 둔다.
--   - 뽑은 기록은 나만 본다 — 서재 캘린더에 북마크로 표시.
--
-- 왜 하루 한 번을 DB 가 지키나:
--   두 탭에서 동시에 펼치기를 눌러도 기록이 하나만 남아야 한다. 앱에서 "있는지 조회 → 없으면
--   저장"을 하면 그 사이에 다른 요청이 끼어든다(경쟁 조건). PRIMARY KEY(user_id, draw_date) +
--   ON CONFLICT DO NOTHING 이면 DB 가 원자적으로 하나만 받는다.
--
-- 날짜는 한국 시간 — 자정(KST)에 새 문장이 열린다. 서버·브라우저 시간대와 무관하게 DB 가 정한다.

-- =====================================================
-- 1. 문장 풀 — 운영자만 쓴다(service role). 사용자는 자기가 뽑은 문장만 읽는다.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.daily_sentences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL CHECK (char_length(btrim(text)) BETWEEN 1 AND 300),
  book_title text NOT NULL CHECK (char_length(btrim(book_title)) BETWEEN 1 AND 200),
  author text,
  translator text,
  page integer CHECK (page IS NULL OR page BETWEEN 1 AND 99999),
  -- 있으면 도서 정보 화면으로 연결한다
  isbn text,
  -- 이용 허락·저작권 만료 근거 등 운영 메모 — 사용자에게는 보이지 않는다
  rights_note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 2. 뽑은 기록 — 하루 한 줄
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sentence_draws (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draw_date date NOT NULL,
  -- 한 번이라도 뽑힌 문장은 지우지 못한다 — 사용자 캘린더 기록이 깨지지 않게. 어드민은 비활성으로 내린다.
  sentence_id uuid NOT NULL REFERENCES public.daily_sentences(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, draw_date)
);

CREATE INDEX IF NOT EXISTS sentence_draws_sentence_idx
  ON public.sentence_draws (sentence_id);

ALTER TABLE public.daily_sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentence_draws ENABLE ROW LEVEL SECURITY;

-- 내가 뽑은 기록만 본다. 쓰기 정책은 없다 — 기록은 아래 draw_daily_sentence() 로만 생긴다.
CREATE POLICY "Users read own sentence draws" ON public.sentence_draws
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 문장은 내가 뽑은 것만 읽힌다 — 풀 전체를 미리 엿볼 수 없다.
-- (비활성으로 내린 문장도 이미 뽑았다면 캘린더에서 계속 보인다)
CREATE POLICY "Users read sentences they drew" ON public.daily_sentences
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.sentence_draws d
      WHERE d.sentence_id = daily_sentences.id AND d.user_id = auth.uid()
    )
  );

-- =====================================================
-- 3. 펼칠 문장이 있는가 — 활성 문장이 0개면 서재에 진입점을 그리지 않는다
-- =====================================================
-- 사용자는 풀을 못 읽으므로 SECURITY DEFINER 로 "있다/없다"만 알려 준다.
CREATE OR REPLACE FUNCTION public.has_daily_sentences()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.daily_sentences WHERE is_active);
$$;

REVOKE ALL ON FUNCTION public.has_daily_sentences() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_daily_sentences() TO authenticated;

-- =====================================================
-- 4. 오늘의 문장 펼치기
-- =====================================================
-- 1) 오늘(KST) 이미 뽑았으면 그 문장을 그대로 돌려준다 — 새로고침·두 번 눌러도 다시 뽑지 않는다.
-- 2) 아니면 활성 문장 중 내가 아직 안 본 것을 무작위로 하나. 다 봤으면 활성 전체에서 다시.
-- 3) 활성 문장이 없으면 아무것도 돌려주지 않는다.
-- SECURITY DEFINER 인 이유: 사용자에게 sentence_draws 쓰기 권한·풀 읽기 권한을 주지 않고,
-- 이 함수가 정한 규칙대로만 기록이 생기게 하려고. 대상 사용자는 항상 auth.uid() 다.
CREATE OR REPLACE FUNCTION public.draw_daily_sentence()
RETURNS TABLE (
  draw_date date,
  sentence_id uuid,
  text text,
  book_title text,
  author text,
  translator text,
  page integer,
  isbn text
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_user uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  v_pick uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'login required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.sentence_draws d
    WHERE d.user_id = v_user AND d.draw_date = v_today
  ) THEN
    SELECT s.id INTO v_pick
    FROM public.daily_sentences s
    WHERE s.is_active
      AND NOT EXISTS (
        SELECT 1 FROM public.sentence_draws d
        WHERE d.user_id = v_user AND d.sentence_id = s.id
      )
    ORDER BY random()
    LIMIT 1;

    IF v_pick IS NULL THEN
      SELECT s.id INTO v_pick
      FROM public.daily_sentences s
      WHERE s.is_active
      ORDER BY random()
      LIMIT 1;
    END IF;

    IF v_pick IS NOT NULL THEN
      -- 동시에 두 요청이 여기까지 와도 PRIMARY KEY 가 하나만 받는다
      INSERT INTO public.sentence_draws (user_id, draw_date, sentence_id)
      VALUES (v_user, v_today, v_pick)
      ON CONFLICT (user_id, draw_date) DO NOTHING;
    END IF;
  END IF;

  RETURN QUERY
  SELECT d.draw_date, s.id, s.text, s.book_title, s.author, s.translator, s.page, s.isbn
  FROM public.sentence_draws d
  JOIN public.daily_sentences s ON s.id = d.sentence_id
  WHERE d.user_id = v_user AND d.draw_date = v_today;
END;
$$;

REVOKE ALL ON FUNCTION public.draw_daily_sentence() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.draw_daily_sentence() TO authenticated;
