/**
 * Profile 엔티티 Query Keys
 * 프로필 관련 React Query 쿼리 키 관리
 */

export const profileKeys = {
  // 모든 프로필 관련 쿼리의 기본 키
  all: ['profiles'] as const,

  // 프로필 조회 (username 기반)
  byUsername: (username: string) =>
    [...profileKeys.all, 'username', username] as const,

  // 프로필 조회 (id 기반)
  details: () => [...profileKeys.all, 'detail'] as const,
  detail: (id: string) => [...profileKeys.details(), id] as const,
} as const;
