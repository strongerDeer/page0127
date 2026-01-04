/**
 * User 엔티티 Query Keys
 * 유저 관련 React Query 쿼리 키 관리
 */

export const userKeys = {
  // 모든 유저 관련 쿼리의 기본 키
  all: ['users'] as const,

  // 현재 로그인한 유저
  me: () => [...userKeys.all, 'me'] as const,

  // 유저 검색
  search: (keyword: string) => [...userKeys.all, 'search', keyword] as const,

  // 유저 상세
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
} as const;
