import type { FollowingLeagueReader } from '@/entities/follow';

export type LeagueMetric = 'books' | 'pages';
export type LeagueReader = FollowingLeagueReader;

export type RankedReader = LeagueReader & {
  value: number;
  rank: number | null;
};

export const metricValue = (
  reader: LeagueReader,
  metric: LeagueMetric
): number => (metric === 'books' ? reader.completedBooks : reader.totalPages);

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
    return { ...reader, value, rank: value > 0 ? rank : null };
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
