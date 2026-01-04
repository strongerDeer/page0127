/**
 * Follow 엔티티 Query Keys
 * 팔로우 관련 React Query 쿼리 키 관리
 */

export const followKeys = {
  // 모든 팔로우 관련 쿼리의 기본 키
  all: ['follows'] as const,

  // 팔로우 여부 확인
  isFollowing: (userId: string) =>
    [...followKeys.all, 'is-following', userId] as const,

  // 팔로워 목록
  followers: (userId: string) =>
    [...followKeys.all, 'followers', userId] as const,

  // 팔로잉 목록
  following: (userId: string) =>
    [...followKeys.all, 'following', userId] as const,

  // 팔로우 통계
  stats: (userId: string) => [...followKeys.all, 'stats', userId] as const,
} as const;
