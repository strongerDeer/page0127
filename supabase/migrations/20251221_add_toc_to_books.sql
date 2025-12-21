-- books 테이블에 목차(toc) 컬럼 추가
-- AI 분석을 위한 추가 데이터
-- 작성일: 2025-12-21

-- 목차 컬럼 추가
ALTER TABLE books
ADD COLUMN IF NOT EXISTS toc TEXT;

-- 목차 컬럼에 대한 설명
COMMENT ON COLUMN books.toc IS '책 목차 (Table of Contents) - AI 분석용';
