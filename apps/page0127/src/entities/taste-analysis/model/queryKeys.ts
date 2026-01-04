/**
 * Taste Analysis 엔티티 Query Keys
 * 취향 분석 관련 React Query 쿼리 키 관리
 */

export const tasteAnalysisKeys = {
  // 모든 취향 분석 관련 쿼리의 기본 키
  all: ['taste-analysis'] as const,

  // 최근 분석 결과
  latest: () => [...tasteAnalysisKeys.all, 'latest'] as const,

  // 특정 분석 결과
  details: () => [...tasteAnalysisKeys.all, 'detail'] as const,
  detail: (id: string) => [...tasteAnalysisKeys.details(), id] as const,
} as const;
