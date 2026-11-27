-- 책 이야기(/blog) 대표 이미지·위치·글 종류
-- 작성일: 2026-11-27
--
-- 왜 (HJ, 2026-11-27):
--   『어린 왕자』 온라인 필사 소개 글처럼 "책은 연결했지만 독후감이 아닌 글"이 생겼다.
--   1) 지금은 책을 연결하면 페이지가 "독후감" 제목을 자동으로 붙인다 → 글 종류를 고르게 한다(is_review)
--   2) 목록 썸네일·공유 미리보기에 쓸 그림 칸이 없어 관계도 칸(map_image)에 표지를 넣어야 했다
--      → 그러면 본문에 "인물관계도"로 나온다. 대표 이미지 칸을 따로 둔다(cover_image)
--   3) 목록 썸네일은 정사각형으로 잘린다 → 어디를 보여 줄지 고르게 한다(cover_position, CSS object-position)
--
-- 기존 행: 모두 책 한 권 독후감이거나 책 없는 글 → is_review 기본 true 로 지금 화면 그대로.
-- 책 없는 글은 is_review 를 보지 않는다(늘 "독서 이야기").

ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS cover_image jsonb
  CHECK (cover_image IS NULL OR jsonb_typeof(cover_image) = 'object');

ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS cover_position text NOT NULL DEFAULT '50% 50%'
  CHECK (cover_position ~ '^(100|[1-9]?[0-9])% (100|[1-9]?[0-9])%$');

ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS is_review boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.stories.cover_image IS '대표 이미지 {src,width,height,alt} — 목록 썸네일·공유 미리보기. 없으면 관계도·자동 그림';
COMMENT ON COLUMN public.stories.cover_position IS '목록 정사각형 썸네일에서 보일 곳(CSS object-position, "가로% 세로%")';
COMMENT ON COLUMN public.stories.is_review IS '책 연결 글이 독후감인가 — false 면 "독후감" 제목 없이 본문만(독서 이야기)';
