/**
 * Like 엔티티 Query Keys
 * 좋아요 관련 React Query 쿼리 키 관리
 */

export const likeKeys = {
  // 모든 좋아요 관련 쿼리의 기본 키
  all: ['likes'] as const,

  // 특정 활동의 좋아요 목록
  byActivity: (activityId: string) =>
    [...likeKeys.all, 'activity', activityId] as const,

  // 특정 활동의 좋아요 개수
  count: (activityId: string) =>
    [...likeKeys.byActivity(activityId), 'count'] as const,
} as const;
