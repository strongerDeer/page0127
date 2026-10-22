// PostgREST 는 한 번에 최대 1,000행만 돌려준다 — 넘으면 에러 없이 잘린다
const PAGE = 1000;

/**
 * 1,000행 상한을 넘어도 끝까지 읽는다. 30일 방문 기록은 사용자가 34명만 넘어도 1,000행을 넘는다.
 * 실패하면 null — 빈 배열로 뭉개면 "그 기간 0건"과 구분이 안 된다.
 */
export const fetchAll = async <T>(
  build: (
    from: number,
    to: number
  ) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
  label: string
): Promise<T[] | null> => {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) {
      console.error(`[admin] 조회 실패(${label}):`, error.message);
      return null;
    }
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) return all;
  }
};
