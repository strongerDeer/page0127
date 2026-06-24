/**
 * 독서 통계 타입
 *
 * 학습 포인트:
 * - 통계 데이터를 별도 타입으로 분리하여 재사용성 향상
 * - MVP에서는 4가지 핵심 통계만 제공
 */
export type BookStats = {
  /** 총 읽은 책 (완독한 책만) */
  totalCompletedBooks: number;

  /** 총 읽은 쪽수 (향후 구현 예정) */
  totalPages: number;

  /** 연간 독서 목표 (user 프로필에서 가져올 예정) */
  yearlyGoal: number;

  /** 완독률 (0-100) */
  completionRate: number;

  /** 월별 독서량 (1-12월) */
  monthlyReading: MonthlyReadingData[];

  /** 카테고리별 독서량 */
  categoryReading: CategoryReadingData[];

  /** 평점별 독서량 */
  ratingReading: RatingReadingData[];

  /** 평균 평점 */
  averageRating: number;

  /** 5점 만점 책 권수 (최고 평점) */
  fiveStarBooks: number;
};

/**
 * 월별 독서량 데이터
 *
 * 학습 포인트:
 * - Recharts에서 사용할 수 있는 형태로 타입 정의
 * - month는 1-12 숫자로 표현 (1월=1, 12월=12)
 */
export type MonthlyReadingData = {
  /** 월 (1-12) */
  month: number;

  /** 해당 월에 완독한 책 권수 */
  count: number;
};

/**
 * 카테고리별 독서량 데이터
 *
 * 학습 포인트:
 * - Recharts RadarChart에서 사용할 수 있는 형태
 * - category는 한글 카테고리명 (예: "컴퓨터/모바일")
 */
export type CategoryReadingData = {
  /** 카테고리명 */
  category: string;

  /** 해당 카테고리의 책 권수 */
  count: number;
};

/**
 * 평점별 독서량 데이터
 *
 * 학습 포인트:
 * - Recharts PieChart(Doughnut)에서 사용할 수 있는 형태
 * - rating은 0, 1, 2, 3, 4, 5, 10점 (7가지 평점)
 * - fill은 차트 색상 (10점: 진한 초록 → 0점: 회색)
 */
export type RatingReadingData = {
  /** 평점 (0, 1, 2, 3, 4, 5, 10) */
  rating: number;

  /** 해당 평점의 책 권수 */
  count: number;

  /** 차트 색상 (색상 그라데이션) */
  fill: string;
};

/**
 * 전체 독서 통계 (All Time Stats)
 *
 * 학습 포인트:
 * - 대시보드 상단 "전체 독서 통계" 섹션에 사용
 * - 연도 무관, 전체 기간의 독서 히스토리
 */
export type OverallStats = {
  /** 독서 여정 */
  journey: ReadingJourney;

  /** 최근 5년 독서량 (Bar Chart용) */
  yearlyTrend: YearlyTrend[];

  /** 평점 분포 (Horizontal Bar용) */
  ratingDistribution: RatingDistribution[];
};

/**
 * 독서 여정 데이터
 *
 * 학습 포인트:
 * - 사용자의 전체 독서 히스토리 요약
 * - 동기 부여 요소 (성취감, 습관 인식)
 */
export type ReadingJourney = {
  /** 총 읽은 책 (전체) */
  totalBooks: number;

  /** 10점 만점 책 권수 */
  perfectScoreBooks: number;

  /** 10점 만점 비율 (%) */
  perfectScoreRate: number;

  /** 총 읽은 쪽수 */
  totalPages: number;

  /** 하루 평균 쪽수 */
  averagePagesPerDay: number;

  /** 독서 시작일 (첫 완독일) */
  readingSince: string;

  /** 독서 년수 */
  readingYears: number;

  /** 예상 독서 시간 (시간) */
  estimatedHours: number;

  /** 예상 독서 시간 (일) */
  estimatedDays: number;
};

/**
 * 연도별 독서량 데이터 (Bar Chart용)
 *
 * 학습 포인트:
 * - 최근 5년 독서량 트렌드
 * - 전년 대비 증가율 계산에 사용
 */
export type YearlyTrend = {
  /** 연도 (YYYY) */
  year: number;

  /** 해당 연도 완독 권수 */
  count: number;
};

/**
 * 평점 분포 데이터 (Horizontal Bar용)
 *
 * 학습 포인트:
 * - 0~10점 평점 분포
 * - 권수와 비율을 함께 표시
 */
export type RatingDistribution = {
  /** 평점 (0, 1, 2, 3, 4, 5, 10) */
  rating: number;

  /** 해당 평점의 책 권수 */
  count: number;

  /** 비율 (%) */
  percentage: number;
};
