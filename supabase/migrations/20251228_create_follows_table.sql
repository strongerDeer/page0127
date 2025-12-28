-- 팔로우/팔로워 시스템 테이블 생성
-- 작성일: 2025-12-28

-- =====================================================
-- 1. follows (팔로우 관계)
-- =====================================================

CREATE TABLE IF NOT EXISTS follows (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 제약조건
  -- 1. 자기 자신을 팔로우할 수 없음
  CONSTRAINT no_self_follow CHECK (follower_id != following_id),

  -- 2. 중복 팔로우 방지 (한 유저가 같은 유저를 두 번 팔로우 불가)
  CONSTRAINT unique_follow UNIQUE (follower_id, following_id)
);

-- =====================================================
-- 2. 인덱스 (성능 최적화)
-- =====================================================

-- 팔로워 목록 조회 최적화 (A를 팔로우하는 사람들)
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

-- 팔로잉 목록 조회 최적화 (A가 팔로우하는 사람들)
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);

-- 팔로우 여부 확인 최적화
CREATE INDEX IF NOT EXISTS idx_follows_follower_following ON follows(follower_id, following_id);

-- 최신순 정렬 최적화
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at DESC);

-- =====================================================
-- 3. RLS (Row Level Security)
-- =====================================================

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 팔로우 관계 조회 가능 (공개 정보)
CREATE POLICY "Anyone can view follows"
  ON follows FOR SELECT
  USING (true);

-- 본인만 팔로우 추가 가능
CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- 본인만 언팔로우 가능
CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- =====================================================
-- 4. 통계 뷰 (선택적 - 성능을 위해 추가)
-- =====================================================

-- 팔로워/팔로잉 카운트를 빠르게 조회하기 위한 뷰
CREATE OR REPLACE VIEW user_follow_stats AS
SELECT
  u.id AS user_id,
  COALESCE(follower_count.count, 0) AS followers_count,
  COALESCE(following_count.count, 0) AS following_count
FROM
  auth.users u
LEFT JOIN (
  SELECT following_id, COUNT(*) AS count
  FROM follows
  GROUP BY following_id
) follower_count ON u.id = follower_count.following_id
LEFT JOIN (
  SELECT follower_id, COUNT(*) AS count
  FROM follows
  GROUP BY follower_id
) following_count ON u.id = following_count.follower_id;

-- =====================================================
-- 완료 메시지
-- =====================================================

-- Migration 완료
-- 팔로우/팔로워 시스템 테이블 생성 완료:
-- 1. follows 테이블 (팔로우 관계 저장)
-- 2. 인덱스 4개 (성능 최적화)
-- 3. RLS 정책 3개 (보안)
-- 4. user_follow_stats 뷰 (통계 조회)
