/**
 * AI 독서 궁합 분석 Entity 타입 정의
 *
 * 학습 포인트:
 * - 두 사용자 간의 독서 궁합을 분석하는 도메인 모델
 * - JSONB 타입으로 유사도 분석 데이터 저장
 * - 상호 추천 도서 관리
 */

/**
 * 유사도 분석
 * JSONB 타입으로 저장되는 구조화된 데이터
 */
export type SimilarityAnalysis = {
  /** 공통 관심사 (예: ["심리", "에세이"]) */
  common_interests: string[];

  /** 독서 패턴 비교 */
  reading_patterns: {
    /** 첫 번째 사용자 패턴 (예: "깊이형") */
    user1: string;
    /** 두 번째 사용자 패턴 (예: "다독형") */
    user2: string;
  };

  /** 별점 패턴 유사도 (0.0 ~ 1.0) */
  rating_similarity: number;

  /** 차이점 (예: ["user1은 고전 선호, user2는 신간 선호"]) */
  differences: string[];

  /** 공통점 (예: ["둘 다 관계에 대한 관심 높음"]) */
  commonalities: string[];
};

/**
 * 독서 궁합 분석 결과
 * Supabase compatibility_analyses 테이블
 */
export type CompatibilityAnalysis = {
  /** 분석 ID */
  id: string;

  /** 첫 번째 사용자 ID */
  user_id_1: string;

  /** 두 번째 사용자 ID */
  user_id_2: string;

  /** 궁합 점수 (0-100) */
  compatibility_score: number;

  /** 궁합 타입 (예: "서로 다른 세계", "영혼의 책벗") */
  compatibility_type: string;

  /** 궁합 설명 */
  compatibility_description: string;

  /** 유사도 분석 (JSONB) */
  similarity_analysis: SimilarityAnalysis;

  /** 첫 번째 사용자의 분석 책 권수 */
  analyzed_books_count_1: number;

  /** 두 번째 사용자의 분석 책 권수 */
  analyzed_books_count_2: number;

  /** 사용한 AI 모델 */
  analysis_model: string;

  /** 분석 비용 (센트 단위) */
  cost_in_cents: number | null;

  /** 생성일 */
  created_at: string;
};

/**
 * 상호 추천 도서
 * Supabase mutual_recommendations 테이블
 */
export type MutualRecommendation = {
  /** 추천 ID */
  id: string;

  /** 궁합 분석 ID (FK) */
  compatibility_analysis_id: string;

  /** 추천하는 사용자 ID */
  from_user_id: string;

  /** 추천받는 사용자 ID */
  to_user_id: string;

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

  /** 표시 순서 (1-3) */
  display_order: number;

  /** 생성일 */
  created_at: string;
};

/**
 * 궁합 분석 결과 + 상호 추천 도서 (조회용)
 */
export type CompatibilityAnalysisWithRecommendations = CompatibilityAnalysis & {
  /** 상호 추천 도서 목록 */
  mutual_recommendations: {
    /** user1이 user2에게 추천하는 책 */
    from_user1_to_user2: MutualRecommendation[];
    /** user2가 user1에게 추천하는 책 */
    from_user2_to_user1: MutualRecommendation[];
  };
};

/**
 * 궁합 분석 생성 DTO
 */
export type CreateCompatibilityAnalysisDto = {
  /** 두 사용자 ID (user_id_1 < user_id_2 순서로) */
  user_id_1: string;
  user_id_2: string;

  /** 궁합 점수 */
  compatibility_score: number;

  /** 궁합 타입 */
  compatibility_type: string;

  /** 궁합 설명 */
  compatibility_description: string;

  /** 유사도 분석 */
  similarity_analysis: SimilarityAnalysis;

  /** 분석 책 권수 */
  analyzed_books_count_1: number;
  analyzed_books_count_2: number;

  /** AI 모델 */
  analysis_model: string;

  /** 비용 */
  cost_in_cents?: number;

  /** 상호 추천 도서 */
  mutual_recommendations: {
    from_user_id: string;
    to_user_id: string;
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
