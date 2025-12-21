# AI 분석 DB 스키마 설계

> AI 독서 취향 분석 및 독서 궁합 측정을 위한 데이터베이스 스키마

---

## 📊 테이블 구조

### 1. `taste_analyses` (독서 취향 분석 결과)

**용도**: 사용자의 독서 성향 및 선호도 분석 결과 저장

```sql
CREATE TABLE taste_analyses (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Key
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 분석 결과
  personality_type TEXT NOT NULL,                    -- 성향 타입 (예: "내면 탐구형")
  personality_description TEXT NOT NULL,             -- 성향 설명 (200-500자)

  -- 선호도 프로필 (JSONB)
  preference_profile JSONB NOT NULL,
  -- {
  --   "liked": {
  --     "topics": ["관계", "심리", "일상의 철학"],
  --     "styles": ["에세이 톤", "개인적 경험"],
  --     "structures": ["300-500페이지", "챕터별 독립적"]
  --   },
  --   "disliked": {
  --     "topics": ["성공", "효율", "생산성"],
  --     "styles": ["딱딱한 이론서"],
  --     "structures": ["500페이지 이상 대작"]
  --   },
  --   "patterns": {
  --     "page_count_preference": "300-500",
  --     "author_type": "작가 출신",
  --     "publication_period": "2000-2010"
  --   }
  -- }

  -- 분석 메타데이터
  analyzed_books_count INT NOT NULL,                 -- 분석에 사용된 책 권수
  analysis_model TEXT NOT NULL,                      -- 사용한 AI 모델 (예: "gpt-4o-mini")
  cost_in_cents INT,                                 -- 분석 비용 (센트 단위)

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_taste_analyses_user_id ON taste_analyses(user_id);
CREATE INDEX idx_taste_analyses_created_at ON taste_analyses(created_at DESC);

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
```

---

### 2. `book_recommendations` (추천 도서)

**용도**: AI가 추천한 도서 목록 저장

```sql
CREATE TABLE book_recommendations (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Key
  taste_analysis_id UUID NOT NULL REFERENCES taste_analyses(id) ON DELETE CASCADE,

  -- 추천 타입
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('match', 'expand', 'challenge')),
  -- 'match': 성향 맞춤
  -- 'expand': 성향 확장
  -- 'challenge': 챌린지

  -- 추천 도서 정보 (알라딘 API 기반)
  isbn TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  cover_image TEXT,
  category TEXT,

  -- 추천 이유
  reason TEXT NOT NULL,                              -- AI가 설명한 추천 이유

  -- 표시 순서
  display_order INT NOT NULL,                        -- 1-5 (각 타입별 5권)

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_book_recommendations_analysis_id ON book_recommendations(taste_analysis_id);
CREATE INDEX idx_book_recommendations_type ON book_recommendations(recommendation_type);

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
```

---

### 3. `compatibility_analyses` (독서 궁합 분석 결과)

**용도**: 두 사용자 간 독서 궁합 분석 결과 저장

```sql
CREATE TABLE compatibility_analyses (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys (두 사용자)
  user_id_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 궁합 점수 및 타입
  compatibility_score INT NOT NULL CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
  compatibility_type TEXT NOT NULL,                  -- 예: "서로 다른 세계", "영혼의 책벗"
  compatibility_description TEXT NOT NULL,           -- 궁합 설명

  -- 유사도 분석 (JSONB)
  similarity_analysis JSONB NOT NULL,
  -- {
  --   "common_interests": ["심리", "에세이"],
  --   "reading_patterns": {
  --     "user1": "깊이형",
  --     "user2": "다독형"
  --   },
  --   "rating_similarity": 0.75,
  --   "differences": ["user1은 고전 선호, user2는 신간 선호"],
  --   "commonalities": ["둘 다 관계에 대한 관심 높음"]
  -- }

  -- 분석 메타데이터
  analyzed_books_count_1 INT NOT NULL,               -- user1의 분석 책 권수
  analyzed_books_count_2 INT NOT NULL,               -- user2의 분석 책 권수
  analysis_model TEXT NOT NULL,
  cost_in_cents INT,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 제약조건: user_id_1 < user_id_2 (중복 방지)
  CONSTRAINT user_order_check CHECK (user_id_1 < user_id_2)
);

-- 인덱스
CREATE INDEX idx_compatibility_analyses_users ON compatibility_analyses(user_id_1, user_id_2);
CREATE INDEX idx_compatibility_analyses_created_at ON compatibility_analyses(created_at DESC);

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
```

---

### 4. `mutual_recommendations` (서로에게 추천하는 책)

**용도**: 궁합 분석 기반 상호 추천 도서 저장

```sql
CREATE TABLE mutual_recommendations (
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
  display_order INT NOT NULL,                        -- 1-3 (각 방향별 3권)

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_mutual_recommendations_analysis_id ON mutual_recommendations(compatibility_analysis_id);
CREATE INDEX idx_mutual_recommendations_from_to ON mutual_recommendations(from_user_id, to_user_id);

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
```

---

## 🔄 데이터 흐름

### 내 취향 분석

```
1. 사용자가 "내 취향 분석하기" 버튼 클릭
2. 백엔드에서 완독한 책 목록 + 별점 조회
3. 알라딘 API로 책 상세 정보 (소개, 목차) 조회
4. OpenAI/Claude API로 분석 요청
5. 분석 결과를 taste_analyses 테이블에 저장
6. 추천 도서(15권)를 book_recommendations 테이블에 저장
7. 프론트엔드로 결과 반환
```

### 독서 궁합 측정

```
1. 사용자가 타인 공개 책장에서 "독서 궁합 측정하기" 클릭
2. 두 사용자의 완독한 책 목록 + 별점 조회
3. 알라딘 API로 책 상세 정보 조회
4. AI API로 궁합 분석 요청
5. 분석 결과를 compatibility_analyses 테이블에 저장
6. 상호 추천 도서(각 3권)를 mutual_recommendations 테이블에 저장
7. 프론트엔드로 결과 반환
```

---

## 💾 캐싱 전략

### 재분석 조건

**취향 분석:**
- 신규 책 5권 이상 추가 시 재분석 권장
- 사용자가 수동으로 재분석 요청 가능
- 최신 분석 결과만 UI에 표시 (created_at DESC LIMIT 1)

**궁합 분석:**
- 어느 한 사용자의 책장이 크게 변경된 경우 재측정 권장
- 사용자가 수동으로 재측정 요청 가능
- 두 사용자 조합별 최신 결과만 표시

---

## 📊 비용 추적

모든 분석 테이블에 `cost_in_cents` 컬럼을 두어:
- 분석별 비용 기록
- 월별 총 비용 집계 가능
- 예산 관리 용이

```sql
-- 월별 총 비용 조회 예시
SELECT
  DATE_TRUNC('month', created_at) as month,
  SUM(cost_in_cents) / 100.0 as total_cost_usd
FROM taste_analyses
WHERE user_id = auth.uid()
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

---

**작성일**: 2025-12-21
