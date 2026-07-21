/**
 * AI 독서 취향 분석 Entity 타입 정의
 *
 * 학습 포인트:
 * - AI 분석 결과를 저장하는 도메인 모델
 * - JSONB 타입은 TypeScript에서 객체 타입으로 정의
 * - 추천 타입은 3가지 (match, expand, challenge)
 */

/**
 * 추천 타입
 * - match: 성향 맞춤 (기존 취향에 딱 맞는 안전한 추천)
 * - expand: 성향 확장 (비슷하지만 조금 다른 영역으로 확장)
 * - challenge: 챌린지 (안 읽었지만 좋아할 가능성 있는 새로운 영역)
 */
export type RecommendationType = 'match' | 'expand' | 'challenge';

/**
 * 선호도 프로필
 * JSONB 타입으로 저장되는 구조화된 데이터
 */
export type PreferenceProfile = {
  /** 좋아하는 패턴 */
  liked: {
    /** 주제 (예: ["관계", "심리", "일상의 철학"]) */
    topics: string[];
    /** 스타일 (예: ["에세이 톤", "개인적 경험"]) */
    styles: string[];
    /** 구조 (예: ["300-500페이지", "챕터별 독립적"]) */
    structures: string[];
  };
  /** 피하는 패턴 */
  disliked: {
    topics: string[];
    styles: string[];
    structures: string[];
  };
  /** 기타 패턴 */
  patterns: {
    /** 선호 페이지 수 (예: "300-500") */
    page_count_preference: string;
    /** 선호 저자 유형 (예: "작가 출신") */
    author_type: string;
    /** 선호 출판 시기 (예: "2000-2010") */
    publication_period: string;
  };
};

/**
 * 독서 취향 분석 결과
 * Supabase taste_analyses 테이블
 */
export type TasteAnalysis = {
  /** 분석 ID */
  id: string;

  /** 사용자 ID */
  user_id: string;

  /** 성향 타입 (예: "내면 탐구형") */
  personality_type: string;

  /** 성향 설명 (200-500자) */
  personality_description: string;

  /** 선호도 프로필 (JSONB) */
  preference_profile: PreferenceProfile;

  /** 분석에 사용된 책 권수 */
  analyzed_books_count: number;

  /** 사용한 AI 모델 (예: "gpt-4o-mini") */
  analysis_model: string;

  /** 분석 비용 (센트 단위) */
  cost_in_cents: number | null;

  /** 생성일 */
  created_at: string;

  /** 수정일 */
  updated_at: string;
};

/**
 * 추천 도서
 * Supabase book_recommendations 테이블
 */
export type BookRecommendation = {
  /** 추천 ID */
  id: string;

  /** 분석 ID (FK) */
  taste_analysis_id: string;

  /** 추천 타입 */
  recommendation_type: RecommendationType;

  /** ISBN */
  isbn: string;

  /** 제목 */
  title: string;

  /** 저자 */
  author: string | null;

  /** 출판사 */
  publisher: string | null;

  /** 표지 이미지 URL */
  cover_image: string | null;

  /** 카테고리 */
  category: string | null;

  /** 추천 이유 */
  reason: string;

  /** 표시 순서 (1-5) */
  display_order: number;

  /** 생성일 */
  created_at: string;
};

/**
 * 취향 분석 기록 카드용 요약 (히스토리 목록)
 */
export type TasteAnalysisSummary = Pick<
  TasteAnalysis,
  'id' | 'personality_type' | 'created_at' | 'analyzed_books_count'
>;

/**
 * 취향 분석 결과 + 추천 도서 (조회용)
 */
export type TasteAnalysisWithRecommendations = TasteAnalysis & {
  /** 추천 도서 목록 (타입별로 그룹화) */
  recommendations: {
    match: BookRecommendation[];
    expand: BookRecommendation[];
    challenge: BookRecommendation[];
  };
};

/**
 * 취향 분석 생성 DTO
 */
export type CreateTasteAnalysisDto = {
  personality_type: string;
  personality_description: string;
  preference_profile: PreferenceProfile;
  analyzed_books_count: number;
  analysis_model: string;
  cost_in_cents?: number;
  recommendations: {
    type: RecommendationType;
    isbn: string;
    title: string;
    author?: string;
    publisher?: string;
    cover_image?: string;
    category?: string;
    reason: string;
    display_order: number;
  }[];
};
