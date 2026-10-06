export type AboutStats = { books: number; readers: number; matches: number };

/** get_about_stats RPC 의 행 — COUNT 는 bigint 라 문자열로 올 수 있다 */
export type AboutStatsRow = {
  books: number | string;
  readers: number | string;
  matches: number | string;
};

/** 작은 숫자는 오히려 역효과다 — 둘 다 넘을 때만 섹션을 보인다 */
export const STATS_MIN = { books: 1000, readers: 100 } as const;

export const shouldShowStats = (s: AboutStats | null): boolean =>
  s !== null && s.books >= STATS_MIN.books && s.readers >= STATS_MIN.readers;

export const toAboutStats = (
  row: AboutStatsRow | undefined
): AboutStats | null =>
  row
    ? {
        books: Number(row.books),
        readers: Number(row.readers),
        matches: Number(row.matches),
      }
    : null;
