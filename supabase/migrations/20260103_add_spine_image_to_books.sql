-- books 테이블에 책등(spine) 이미지 컬럼 추가
-- 책장 UI에서 책등 이미지를 표시하기 위한 필드
-- 작성일: 2026-01-03

-- 책등 이미지 컬럼 추가
ALTER TABLE books
ADD COLUMN IF NOT EXISTS spine_image TEXT;

-- 컬럼에 대한 설명
COMMENT ON COLUMN books.spine_image IS '책등 이미지 URL (알라딘 spineflip 이미지) - 책장 UI용';
