/**
 * Comment 엔티티 Query Keys
 * 댓글 관련 React Query 쿼리 키 관리
 */

export const commentKeys = {
  // 모든 댓글 관련 쿼리의 기본 키
  all: ['comments'] as const,

  // 특정 활동의 댓글 목록
  byActivity: (activityId: string) =>
    [...commentKeys.all, 'activity', activityId] as const,

  // 댓글 상세
  details: () => [...commentKeys.all, 'detail'] as const,
  detail: (id: string) => [...commentKeys.details(), id] as const,
} as const;
