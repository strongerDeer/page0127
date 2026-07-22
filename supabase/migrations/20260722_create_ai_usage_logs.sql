-- AI 기능(취향 분석, 궁합 분석) 월별 사용량 제한을 위한 로그 테이블
-- 작성일: 2026-07-22

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('taste_analysis', 'compatibility')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스: 사용자별/기능별 이번 달 사용 횟수 카운트 조회에 사용
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_feature_created
  ON ai_usage_logs(user_id, feature, created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- 본인만 조회 가능
CREATE POLICY "Users can view their own usage logs"
  ON ai_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 본인만 삽입 가능
CREATE POLICY "Users can insert their own usage logs"
  ON ai_usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
