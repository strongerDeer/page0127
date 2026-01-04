/**
 * Compatibility 엔티티 Query Keys
 * 호환성 분석 관련 React Query 쿼리 키 관리
 */

export const compatibilityKeys = {
  // 모든 호환성 분석 관련 쿼리의 기본 키
  all: ['compatibility'] as const,

  // 특정 유저와의 호환성 분석
  withUser: (userId: string) =>
    [...compatibilityKeys.all, 'user', userId] as const,

  // 분석 결과 상세
  details: () => [...compatibilityKeys.all, 'detail'] as const,
  detail: (id: string) => [...compatibilityKeys.details(), id] as const,
} as const;
