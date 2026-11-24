-- 책 이야기(/blog)에 책 없는 글 허용 — 독서 통계 같은 "독서에 관한 글"
-- 작성일: 2026-11-24
--
-- 왜 (HJ, 2026-11-24): /blog 를 "책 한 권의 독후감"만이 아니라 "책 관련 이야기 블로그"로 쓴다.
-- 첫 글은 국민 독서실태 조사·사회조사를 차트로 옮긴 글이라 연결할 책이 없다.
-- → book_id 를 비워 둘 수 있게 한다. 책이 있는 글은 지금과 똑같이 그린다.
--
-- 지키는 규칙:
--   1) 책이 없으면 책 제목·저자도 비어 있다 — 화면이 "책 있는 글"로 잘못 그리지 않게
--   2) 책이 없으면 별점도 0 — 별점은 "그 책에 준 별점"이라 책 없이는 뜻이 없다
-- 기존 행은 모두 책이 있고 제목이 차 있어서 CHECK 를 바로 통과한다.
--
-- lead_stat: 본문의 첫 차트(```chart) 큰 숫자 {value, unit, label, people}.
--   목록(/blog)과 공유 이미지가 "38.5%" 같은 숫자를 그리는 데 쓴다. 목록은 캐시 크기 때문에 본문을 읽지 않으므로,
--   어드민이 저장할 때 서버가 본문에서 뽑아 이 칸에 넣는다(features/admin-stories). 손으로 고치지 않는다.

ALTER TABLE public.stories ALTER COLUMN book_id DROP NOT NULL;
ALTER TABLE public.stories ALTER COLUMN book_title SET DEFAULT '';

ALTER TABLE public.stories DROP CONSTRAINT IF EXISTS stories_book_fields_match;
ALTER TABLE public.stories ADD CONSTRAINT stories_book_fields_match CHECK (
  book_id IS NOT NULL OR (book_title = '' AND book_author = '' AND rating = 0)
);

ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS lead_stat jsonb
  CHECK (lead_stat IS NULL OR jsonb_typeof(lead_stat) = 'object');
