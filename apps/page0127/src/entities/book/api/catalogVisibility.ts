/**
 * 공용 도서 목록(전체 도서·책 정보·홈 표지·사이트맵)에서 직접 등록 책을 가리는 필터.
 *
 * 직접 등록 책(source='manual')은 검수에서 승인돼도 **등록한 사람에게만** 보인다
 * (HJ, 2026-11-04). 서점 정보가 아니라 한 사람이 적은 정보라, 다른 사람에게
 * 공용 목록처럼 보이면 안 된다. 등록한 사람의 서재 기록은 그대로다.
 *
 * PostgREST `or` 조각이다 — `.or(catalogVisibilityFilter(userId))`.
 * 여러 `.or()` 는 AND 로 묶이므로 검색 조건과 같이 써도 된다.
 * source 가 비어 있는 옛 행은 서점 책이라 남긴다(`neq` 만 쓰면 NULL 이 빠진다).
 */
export const catalogVisibilityFilter = (userId?: string | null) => {
  const providerOnly = 'source.is.null,source.neq.manual';
  return userId ? `${providerOnly},submitted_by.eq.${userId}` : providerOnly;
};
