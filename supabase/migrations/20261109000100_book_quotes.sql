-- 책 문장 기록("간직한 문장") — 책 상세에서 + 로 한 문장씩 적어 둔다
-- 작성일: 2026-11-09
--
-- 왜 books.id 가 아니라 (user_id, isbn) 인가 (HJ 결정, 2026-11-09):
--   같은 책을 다시 읽으면 books 행이 하나 더 생긴다(회독). 기록 행에 걸면 회독마다
--   문장이 흩어지고, 기록 하나를 지우면 문장도 함께 사라진다. "내가 이 책에서 밑줄 친
--   문장"은 회독과 상관없는 것이라 계정 + ISBN 에 건다. books.isbn 은 NOT NULL 이고
--   직접 등록 책도 isbn 을 갖고 있어 예외가 없다.
--
-- 공개 범위 (HJ 결정, 2026-11-09): 나만 본다. 공개 서재 설정과 무관하다.
--   그래서 SELECT 정책도 본인 행만 연다 — 페이지가 주인일 때만 조회하는 것에 더해
--   DB 가 한 번 더 막는다(다층 방어).
--
-- 글자 수: 1~200자. 폼(entities/quote/model/quoteInput.ts)과 같은 숫자다.
--   char_length 는 유니코드 코드 포인트 수 — 폼도 [...text].length 로 같은 기준을 쓴다.

CREATE TABLE IF NOT EXISTS public.book_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  isbn text NOT NULL,
  text text NOT NULL CHECK (char_length(btrim(text)) BETWEEN 1 AND 200),
  page integer CHECK (page IS NULL OR page BETWEEN 1 AND 99999),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 책 상세: 내 문장 중 이 책 것만, 적은 순서대로
CREATE INDEX IF NOT EXISTS book_quotes_user_isbn_idx
  ON public.book_quotes (user_id, isbn, created_at);

ALTER TABLE public.book_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own book quotes" ON public.book_quotes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users add own book quotes" ON public.book_quotes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users edit own book quotes" ON public.book_quotes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own book quotes" ON public.book_quotes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =====================================================
-- 서재(프로필)용: 내 문장 하나를 무작위로
-- =====================================================
-- supabase-js 로는 ORDER BY random() 을 쓸 수 없어 함수로 둔다.
-- SECURITY INVOKER(기본값)라 위 RLS 가 그대로 걸린다 → 남의 문장은 애초에 후보가 아니다.
-- 책 제목·링크는 그 ISBN 의 내 최신 기록에서 가져온다. 기록을 모두 지웠으면 book_id·title 이
-- NULL 로 오고, 화면은 문장만 보여 준다(문장은 기록과 따로 남기로 했으므로).
CREATE OR REPLACE FUNCTION public.random_book_quote()
RETURNS TABLE (
  id uuid,
  isbn text,
  text text,
  page integer,
  book_id uuid,
  title text
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT q.id, q.isbn, q.text, q.page, b.id, b.title
  FROM public.book_quotes q
  LEFT JOIN LATERAL (
    SELECT bk.id, bk.title
    FROM public.books bk
    WHERE bk.user_id = q.user_id AND bk.isbn = q.isbn
    ORDER BY bk.created_at DESC
    LIMIT 1
  ) b ON true
  WHERE q.user_id = auth.uid()
  ORDER BY random()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.random_book_quote() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.random_book_quote() TO authenticated;
