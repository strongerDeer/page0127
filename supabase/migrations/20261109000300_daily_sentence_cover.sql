-- 오늘의 문장 — 책 표지를 문장과 함께 저장한다
-- 작성일: 2026-11-09
--
-- 왜 (HJ, 2026-11-09): 펼친 카드 왼쪽이 빈 책장 그림뿐이라 허전했다. 그 자리에 책 표지를 둔다.
--
-- 왜 global_books 에서 찾지 않고 문장 행에 저장하나:
--   운영자가 고르는 책은 고전처럼 아직 아무도 서재에 담지 않은 책이 많다. global_books 에는
--   누군가 등록한 책만 있어서, 거기서 찾으면 그런 책은 표지가 빈다. 어드민에서 책을 검색해
--   고를 때 서점 표지 주소를 그대로 받아 둔다.
--
-- https 만 받는다 — 화면이 next/image 로 그리므로, 이상한 값이 들어가 화면이 깨지지 않게.
-- 허용 호스트(YES24·Storage) 확인은 어드민 폼(features/admin-sentences)이 한다.

ALTER TABLE public.daily_sentences
  ADD COLUMN IF NOT EXISTS cover_image text
  CHECK (cover_image IS NULL OR cover_image ~ '^https://');

-- 돌려주는 열이 바뀌면 CREATE OR REPLACE 로는 안 된다(반환 형식 변경) → 지우고 다시 만든다.
-- 본문은 20261109000200 과 같고, 반환에 cover_image 하나만 더했다.
DROP FUNCTION IF EXISTS public.draw_daily_sentence();

CREATE FUNCTION public.draw_daily_sentence()
RETURNS TABLE (
  draw_date date,
  sentence_id uuid,
  text text,
  book_title text,
  author text,
  translator text,
  page integer,
  isbn text,
  cover_image text
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
      INSERT INTO public.sentence_draws (user_id, draw_date, sentence_id)
      VALUES (v_user, v_today, v_pick)
      ON CONFLICT (user_id, draw_date) DO NOTHING;
    END IF;
  END IF;

  RETURN QUERY
  SELECT d.draw_date, s.id, s.text, s.book_title, s.author, s.translator, s.page, s.isbn, s.cover_image
  FROM public.sentence_draws d
  JOIN public.daily_sentences s ON s.id = d.sentence_id
  WHERE d.user_id = v_user AND d.draw_date = v_today;
END;
$$;

REVOKE ALL ON FUNCTION public.draw_daily_sentence() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.draw_daily_sentence() TO authenticated;
