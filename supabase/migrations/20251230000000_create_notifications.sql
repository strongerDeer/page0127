-- 알림 시스템 테이블 생성
-- notifications 테이블: 사용자 알림 저장
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 알림 종류: 'follow', 'comment', 'like'
  type TEXT NOT NULL CHECK (type IN ('follow', 'comment', 'like')),

  -- 알림을 발생시킨 사용자 (누가 팔로우/댓글/좋아요를 했는지)
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 관련 리소스 ID (댓글 ID, 활동 ID 등)
  target_id UUID,
  target_type TEXT, -- 'activity', 'comment' 등

  -- 읽음 여부
  is_read BOOLEAN NOT NULL DEFAULT false,

  -- 알림 메시지 (선택적, 프론트에서 생성할 수도 있음)
  message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성: 빠른 조회를 위함
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- 복합 인덱스: 사용자별 읽지 않은 알림 조회 최적화
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인의 알림만 조회 가능
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS 정책: 시스템만 알림 생성 가능 (서버 API에서만)
CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- RLS 정책: 본인의 알림만 업데이트 가능 (읽음 처리)
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS 정책: 본인의 알림만 삭제 가능
CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 알림 통계 조회를 위한 함수 (읽지 않은 알림 개수)
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id AND is_read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
