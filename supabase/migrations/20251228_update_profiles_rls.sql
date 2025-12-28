-- profiles 테이블 RLS 정책 업데이트
-- 작성일: 2025-12-28

-- =====================================================
-- 1. 공개 서재를 위한 RLS 정책 추가
-- =====================================================

-- 모든 사용자가 프로필 조회 가능 (공개 서재용)
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;

CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

-- =====================================================
-- 2. 본인만 프로필 수정 가능
-- =====================================================

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- 3. 본인만 프로필 삽입 가능
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- 완료 메시지
-- =====================================================

-- Migration 완료
-- profiles 테이블 RLS 정책 업데이트 완료
-- - 모든 사용자가 프로필 조회 가능 (공개 서재)
-- - 본인만 수정/삽입 가능
