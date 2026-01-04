-- books 테이블에 재독 횟수 컬럼 추가
-- 같은 책을 여러 번 읽은 경우 추적
-- 작성일: 2026-01-03

-- 재독 횟수 컬럼 추가 (기본값 1)
ALTER TABLE books
ADD COLUMN IF NOT EXISTS read_count INTEGER DEFAULT 1 NOT NULL;

-- 컬럼에 대한 설명
COMMENT ON COLUMN books.read_count IS '재독 횟수 (1: 첫 독서, 2: 2회독, 3: 3회독...)';
