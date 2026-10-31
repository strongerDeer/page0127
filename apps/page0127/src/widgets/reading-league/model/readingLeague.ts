import type { FollowingLeagueReader } from '@/entities/follow';

export type LeagueMetric = 'books' | 'pages' | 'genres';
export type LeagueReader = FollowingLeagueReader;

export type RankedReader = LeagueReader & {
  value: number;
  rank: number | null;
};

export const metricValue = (
  reader: LeagueReader,
  metric: LeagueMetric
): number =>
  metric === 'books'
    ? reader.completedBooks
    : metric === 'pages'
      ? reader.totalPages
      : (reader.genres?.length ?? 0);

export const rankReaders = (
  readers: LeagueReader[],
  metric: LeagueMetric
): RankedReader[] => {
  const sorted = [...readers].sort(
    (a, b) =>
      metricValue(b, metric) - metricValue(a, metric) ||
      (a.nickname ?? a.username ?? '').localeCompare(
        b.nickname ?? b.username ?? '',
        'ko'
      ) ||
      a.userId.localeCompare(b.userId)
  );
  let rank = 0;
  return sorted.map((reader, index) => {
    const value = metricValue(reader, metric);
    if (index === 0 || value !== metricValue(sorted[index - 1], metric)) {
      rank = index + 1;
    }
    return { ...reader, value, rank };
  });
};

export const battleState = (mine: number, other: number) => {
  const sum = mine + other;
  return {
    // 둘 다 0이면 우열이 없으므로 가운데를 유지한다.
    share: sum > 0 ? (mine / sum) * 100 : 50,
    gap: Math.abs(mine - other),
    tied: mine === other,
    close:
      mine !== other && Math.abs(mine - other) / Math.max(mine, other) <= 0.2,
    leading: mine === other ? 'tie' : mine > other ? 'me' : 'other',
  } as const;
};

export type CompactRow<T> = { type: 'reader'; reader: T } | { type: 'gap' };

/**
 * 카드에 보일 순위 줄을 고른다.
 * 상위 `top`명 + 내 바로 위·나·바로 아래만 남기고, 끊긴 자리는 gap으로 표시한다.
 * 한 줄만 건너뛰는 gap은 그 줄을 그냥 보여주는 편이 짧고 덜 헷갈린다.
 */
export const compactRanking = <T extends { userId: string }>(
  readers: T[],
  currentUserId: string,
  top = 5
): { rows: CompactRow<T>[]; hidden: number } => {
  const myIndex = readers.findIndex((r) => r.userId === currentUserId);
  const keep = new Set<number>();
  for (let i = 0; i < Math.min(top, readers.length); i++) keep.add(i);
  if (myIndex >= 0)
    for (let i = myIndex - 1; i <= myIndex + 1; i++)
      if (i >= 0 && i < readers.length) keep.add(i);
  const indexes = [...keep].sort((a, b) => a - b);
  // 사이에 한 명만 빠졌으면 gap 대신 그 사람을 채운다.
  for (let k = 1; k < indexes.length; k++)
    if (indexes[k] - indexes[k - 1] === 2) keep.add(indexes[k] - 1);
  // 마지막 줄 뒤에 한 명만 남았으면 그 사람도 보여준다.
  const last = Math.max(...keep);
  if (readers.length - 1 - last === 1) keep.add(readers.length - 1);

  const rows: CompactRow<T>[] = [];
  let prev = -1;
  for (const i of [...keep].sort((a, b) => a - b)) {
    if (i - prev > 1) rows.push({ type: 'gap' });
    rows.push({ type: 'reader', reader: readers[i] });
    prev = i;
  }
  if (prev < readers.length - 1) rows.push({ type: 'gap' });
  return { rows, hidden: readers.length - keep.size };
};
