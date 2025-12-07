/**
 * Book 엔티티 Query Keys
 *
 * 학습 포인트:
 * - React Query의 쿼리 키 계층 구조 패턴
 * - 배열 스프레드로 상위 키를 포함하여 무효화(invalidation) 용이
 * - as const로 타입 안전성 보장
 *
 * 사용 예시:
 * - 특정 책 조회: useQuery({ queryKey: bookKeys.detail(id) })
 * - 전체 목록 무효화: queryClient.invalidateQueries({ queryKey: bookKeys.lists() })
 * - 특정 책만 무효화: queryClient.invalidateQueries({ queryKey: bookKeys.detail(id) })
 */
export const bookKeys = {
  // 모든 book 관련 쿼리의 기본 키
  all: ['books'] as const,

  // 목록 조회 관련
  lists: () => [...bookKeys.all, 'list'] as const,
  list: (filters?: {
    status?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }) => [...bookKeys.lists(), filters] as const,

  // 상세 조회 관련
  details: () => [...bookKeys.all, 'detail'] as const,
  detail: (id: string) => [...bookKeys.details(), id] as const,
} as const;
