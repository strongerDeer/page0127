-- profiles 테이블에 username 컬럼 추가
-- 작성일: 2025-12-28

-- =====================================================
-- 1. username 컬럼 추가 (없는 경우)
-- =====================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- =====================================================
-- 2. 인덱스 추가
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- =====================================================
-- 3. 기존 사용자에게 자동으로 username 생성 (이메일 기반)
-- =====================================================

-- username이 null인 사용자에게 이메일 앞부분을 username으로 설정
-- 예: test@example.com -> test
UPDATE profiles
SET username = LOWER(SPLIT_PART(email, '@', 1))
WHERE username IS NULL AND email IS NOT NULL;

-- =====================================================
-- 완료 메시지
-- =====================================================

-- Migration 완료
-- profiles 테이블에 username 컬럼 추가 및 기존 사용자 자동 설정 완료
