-- AI 독서 취향 분석 및 독서 궁합 측정 테이블 생성
-- 작성일: 2025-12-21

-- =====================================================
-- 1. taste_analyses (독서 취향 분석 결과)
-- =====================================================

CREATE TABLE IF NOT EXISTS taste_analyses (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Key
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 분석 결과
  personality_type TEXT NOT NULL,
  personality_description TEXT NOT NULL,

  -- 선호도 프로필 (JSONB)
  preference_profile JSONB NOT NULL,

  -- 분석 메타데이터
  analyzed_books_count INT NOT NULL,
  analysis_model TEXT NOT NULL,
  cost_in_cents INT,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_taste_analyses_user_id ON taste_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_taste_analyses_created_at ON taste_analyses(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE taste_analyses ENABLE ROW LEVEL SECURITY;

-- 본인만 조회 가능
CREATE POLICY "Users can view their own taste analyses"
  ON taste_analyses FOR SELECT
  USING (auth.uid() = user_id);

-- 본인만 삽입 가능
CREATE POLICY "Users can insert their own taste analyses"
  ON taste_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 2. book_recommendations (추천 도서)
-- =====================================================

CREATE TABLE IF NOT EXISTS book_recommendations (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Key
  taste_analysis_id UUID NOT NULL REFERENCES taste_analyses(id) ON DELETE CASCADE,

  -- 추천 타입
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('match', 'expand', 'challenge')),

  -- 추천 도서 정보 (알라딘 API 기반)
  isbn TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  cover_image TEXT,
  category TEXT,

  -- 추천 이유
  reason TEXT NOT NULL,

  -- 표시 순서
  display_order INT NOT NULL,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_book_recommendations_analysis_id ON book_recommendations(taste_analysis_id);
CREATE INDEX IF NOT EXISTS idx_book_recommendations_type ON book_recommendations(recommendation_type);

-- RLS
ALTER TABLE book_recommendations ENABLE ROW LEVEL SECURITY;

-- 본인의 분석에 연결된 추천만 조회 가능
CREATE POLICY "Users can view their own recommendations"
  ON book_recommendations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM taste_analyses
      WHERE taste_analyses.id = book_recommendations.taste_analysis_id
      AND taste_analyses.user_id = auth.uid()
    )
  );

-- =====================================================
-- 3. compatibility_analyses (독서 궁합 분석 결과)
-- =====================================================

CREATE TABLE IF NOT EXISTS compatibility_analyses (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys (두 사용자)
  user_id_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 궁합 점수 및 타입
  compatibility_score INT NOT NULL CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
  compatibility_type TEXT NOT NULL,
  compatibility_description TEXT NOT NULL,

  -- 유사도 분석 (JSONB)
  similarity_analysis JSONB NOT NULL,

  -- 분석 메타데이터
  analyzed_books_count_1 INT NOT NULL,
  analyzed_books_count_2 INT NOT NULL,
  analysis_model TEXT NOT NULL,
  cost_in_cents INT,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 제약조건: user_id_1 < user_id_2 (중복 방지)
  CONSTRAINT user_order_check CHECK (user_id_1 < user_id_2)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_compatibility_analyses_users ON compatibility_analyses(user_id_1, user_id_2);
CREATE INDEX IF NOT EXISTS idx_compatibility_analyses_created_at ON compatibility_analyses(created_at DESC);

-- RLS
ALTER TABLE compatibility_analyses ENABLE ROW LEVEL SECURITY;

-- 두 사용자 중 한 명이면 조회 가능
CREATE POLICY "Users can view their own compatibility analyses"
  ON compatibility_analyses FOR SELECT
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- 두 사용자 중 한 명이면 삽입 가능
CREATE POLICY "Users can insert compatibility analyses involving them"
  ON compatibility_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- =====================================================
-- 4. mutual_recommendations (서로에게 추천하는 책)
-- =====================================================

CREATE TABLE IF NOT EXISTS mutual_recommendations (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Key
  compatibility_analysis_id UUID NOT NULL REFERENCES compatibility_analyses(id) ON DELETE CASCADE,

  -- 추천 방향
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 추천 도서 정보
  isbn TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  cover_image TEXT,
  category TEXT,

  -- 추천 이유
  reason TEXT NOT NULL,

  -- 표시 순서
  display_order INT NOT NULL,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_mutual_recommendations_analysis_id ON mutual_recommendations(compatibility_analysis_id);
CREATE INDEX IF NOT EXISTS idx_mutual_recommendations_from_to ON mutual_recommendations(from_user_id, to_user_id);

-- RLS
ALTER TABLE mutual_recommendations ENABLE ROW LEVEL SECURITY;

-- 본인의 궁합 분석에 연결된 추천만 조회 가능
CREATE POLICY "Users can view their mutual recommendations"
  ON mutual_recommendations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM compatibility_analyses ca
      WHERE ca.id = mutual_recommendations.compatibility_analysis_id
      AND (ca.user_id_1 = auth.uid() OR ca.user_id_2 = auth.uid())
    )
  );

-- =====================================================
-- 완료 메시지
-- =====================================================

-- Migration 완료
-- AI 분석 관련 4개 테이블 생성 완료:
-- 1. taste_analyses (독서 취향 분석)
-- 2. book_recommendations (추천 도서)
-- 3. compatibility_analyses (독서 궁합)
-- 4. mutual_recommendations (상호 추천 도서)
