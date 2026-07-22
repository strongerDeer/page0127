-- 계정 삭제 시 데이터 처리 정책
-- 1. 댓글: 보존 (커뮤니티 보호)
-- 2. 활동/피드: 삭제 (내가 올린 콘텐츠)

-- ========================================
-- 1. 댓글 테이블 (comments) - 보존
-- ========================================

-- user_id 컬럼을 nullable로 변경
ALTER TABLE comments
ALTER COLUMN user_id DROP NOT NULL;

-- ON DELETE CASCADE를 ON DELETE SET NULL로 변경
ALTER TABLE comments
DROP CONSTRAINT IF EXISTS comments_user_id_fkey;

ALTER TABLE comments
ADD CONSTRAINT comments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE SET NULL;

-- 설명:
-- - 사용자 계정 삭제 시 댓글은 삭제되지 않고 user_id가 NULL로 설정됨
-- - 프론트엔드에서 user_id가 NULL인 경우 "탈퇴한 사용자"로 표시
-- - 다른 사람 글에 단 댓글은 보존 (커뮤니티 대화 맥락 유지)

-- ========================================
-- 2. 활동/피드 테이블 (activities) - 삭제
-- ========================================

-- ON DELETE SET NULL을 ON DELETE CASCADE로 변경 (내가 올린 피드는 완전 삭제)
ALTER TABLE activities
DROP CONSTRAINT IF EXISTS activities_user_id_fkey;

ALTER TABLE activities
ADD CONSTRAINT activities_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 설명:
-- - 사용자 계정 삭제 시 내가 올린 활동/피드는 완전 삭제
-- - 주체 콘텐츠(내 글)는 삭제, 반응(댓글)만 보존하는 정책

-- ========================================
-- 3. 활동 댓글 테이블 (activity_comments) - 보존
-- ========================================

-- user_id 컬럼을 nullable로 변경
ALTER TABLE activity_comments
ALTER COLUMN user_id DROP NOT NULL;

-- ON DELETE CASCADE를 ON DELETE SET NULL로 변경
ALTER TABLE activity_comments
DROP CONSTRAINT IF EXISTS activity_comments_user_id_fkey;

ALTER TABLE activity_comments
ADD CONSTRAINT activity_comments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE SET NULL;

-- 설명:
-- - 사용자 계정 삭제 시 다른 사람 피드/활동에 단 댓글은 삭제되지 않고 user_id가 NULL로 설정됨
-- - 프론트엔드에서 user_id가 NULL인 경우 "탈퇴한 사용자"로 표시
-- - 대화 맥락 유지 및 다른 사용자 보호
