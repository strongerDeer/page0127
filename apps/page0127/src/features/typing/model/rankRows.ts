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
