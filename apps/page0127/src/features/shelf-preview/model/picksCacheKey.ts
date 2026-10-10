/**
 * 맛보기 책 조회의 캐시 키 — 목록 자체를 키에 넣는다.
 *
 * 왜: unstable_cache 의 결과는 배포가 바뀌어도 남는다(Vercel 데이터 캐시).
 * 키가 고정이면 목록을 고쳐 배포해도 최대 revalidate(1시간) 동안 예전 목록이 나간다.
 * 2026-10-09 실제로 10권 → 24권 배포 직후 운영에 예전 10권이 그대로 보였다.
 */
export const toPicksCacheKey = (isbns: readonly string[]): string[] => [
  'shelf-preview',
  'picks',
  isbns.join(','),
];
