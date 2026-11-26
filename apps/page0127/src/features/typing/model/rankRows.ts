import type { TypingRankRow } from '@/entities/typing';

export type RankLine =
  | {
      type: 'row';
      index: number;
      rank: number;
      row: TypingRankRow;
      isMe: boolean;
    }
  | { type: 'gap' };

/**
 * 랭킹 카드에 보일 줄 — 상위 5명 + 내 바로 위·나·바로 아래(라운지 리그 랭킹과 같은 규칙).
 * 같은 값이면 같은 순위(1, 2, 2, 4).
 */
export const rankLines = (rows: TypingRankRow[], top = 5): RankLine[] => {
  const ranks: number[] = [];
  rows.forEach((row, i) => {
    ranks.push(i > 0 && rows[i - 1].value === row.value ? ranks[i - 1] : i + 1);
  });
  const me = rows.findIndex((r) => r.isMe);
  const keep = new Set<number>();
  for (let i = 0; i < Math.min(top, rows.length); i++) keep.add(i);
  if (me >= 0)
    for (let i = me - 1; i <= me + 1; i++)
      if (i >= 0 && i < rows.length) keep.add(i);

  const lines: RankLine[] = [];
  let prev = -1;
  for (const i of [...keep].sort((a, b) => a - b)) {
    if (i - prev > 1) lines.push({ type: 'gap' });
    lines.push({
      type: 'row',
      index: i,
      rank: ranks[i],
      row: rows[i],
      isMe: i === me,
    });
    prev = i;
  }
  return lines;
};

export type RankPlace = {
  /** 이 타수면 몇 위인지. 불러온 목록(상위 limit 명) 밖이면 null */
  rank: number | null;
  /** 바로 위 사람과의 타수 차이. 1위면 null */
  gapToNext: number | null;
};

/**
 * 결과 창 안내용 — "지금 기록이면 몇 위인지"(HJ 2026-11-26: 기록에 따라 순위를 보여 주고 등록 유도).
 * 내 줄(isMe)은 빼고 남들과만 비교한다. 같은 타수면 같은 순위(남보다 큰 값만 센다).
 * rows 는 상위 limit 명까지만 오므로, 목록이 꽉 찼는데 그 끝보다 낮으면 순위를 모른다(null).
 */
export const placeFor = (
  rows: TypingRankRow[],
  value: number,
  limit = 100
): RankPlace => {
  const others = rows.filter((r) => !r.isMe);
  const above = others.filter((r) => r.value > value);
  const lowest = others.length ? Math.min(...others.map((r) => r.value)) : 0;
  if (rows.length >= limit && above.length === others.length && value < lowest)
    return { rank: null, gapToNext: null };
  const next = above.length ? Math.min(...above.map((r) => r.value)) : null;
  return {
    rank: above.length + 1,
    gapToNext: next === null ? null : next - value,
  };
};
