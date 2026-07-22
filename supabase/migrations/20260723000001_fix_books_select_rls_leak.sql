-- books 테이블 RLS 취약점 수정: 비공개 책이 anon 키로 그대로 조회되던 문제
--
-- 기존에 SELECT 정책이 두 개 걸려 있었다:
--   "Allow all to view books"   USING (true)                -- 조건 없음
--   "Users can view own books"  USING (auth.uid() = user_id)
-- Postgres RLS는 같은 명령(SELECT)의 permissive 정책을 OR로 합친다. 조건 없는
-- true 정책 하나가 이미 전체 허용이라, is_public=false로 설정해도 anon 키로
-- REST API에 직접 요청하면 personal_memo 등 비공개 정보까지 그대로 노출됐다
-- (앱의 /api/books/[id] 라우트가 하는 수동 체크는 DB에 직접 접근하면 우회된다).
--
-- 작성일: 2026-07-23

DROP POLICY IF EXISTS "Allow all to view books" ON public.books;

CREATE POLICY "Anyone can view public books" ON public.books
  FOR SELECT USING (is_public = true);

-- "Users can view own books"(auth.uid() = user_id)는 그대로 둔다 — 비공개 책도
-- 본인은 봐야 하므로. 두 정책이 OR로 합쳐져 "공개 책이거나 내 책이면 조회 가능"이 된다.
