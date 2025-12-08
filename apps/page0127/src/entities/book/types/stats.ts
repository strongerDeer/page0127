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
};
