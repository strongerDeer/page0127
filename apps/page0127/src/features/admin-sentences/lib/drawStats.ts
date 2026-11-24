/**
 * 오늘의 문장 "뽑기를 쓰나?" 집계 — DB 조회 없이 계산만 (HJ, 2026-11-24).
 *
 * sentence_draws 는 하루 한 사람 한 줄(PRIMARY KEY user_id, draw_date)이라
 * "그날 뽑기 수 = 그날 뽑은 사람 수"다. 그래서 이번 주 뽑기(연인원)와
 * 이번 주 뽑은 사람(순 인원)을 따로 센다 — 3일 연속 뽑은 1명은 뽑기 3, 사람 1.
 */

export type DrawRow = {
  user_id: string;
  draw_date: string;
  sentence_id: string;
};

export type DrawStats = {
  /** 최근 7일(오늘 포함) 뽑기 수 */
  weekDraws: number;
  /** 그 전 7일 뽑기 수 — 증감 */
  prevWeekDraws: number;
  /** 최근 7일 뽑은 사람 (같은 사람은 한 번) */
  weekDrawers: number;
  /** 최근 28일 뽑은 사람 */
  monthDrawers: number;
  /** 최근 7일 하루별 — 오래된 날부터, 마지막이 오늘 */
  daily: { date: string; label: string; count: number }[];
  /** 최근 28일 많이 뽑힌 문장 (sentence_id, 횟수) — 많은 순 5개 */
  top: { sentenceId: string; count: number }[];
};

export const DAILY_DAYS = 7;
export const STATS_WINDOW_DAYS = 28;
const TOP_N = 5;

/** 'YYYY-MM-DD' + n 일 (UTC 계산이라 시간대 영향 없음) */
export const shiftDate = (dateKey: string, n: number): string => {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const summarizeDraws = (rows: DrawRow[], today: string): DrawStats => {
  const weekStart = shiftDate(today, -(DAILY_DAYS - 1));
  const prevStart = shiftDate(weekStart, -DAILY_DAYS);
  const monthStart = shiftDate(today, -(STATS_WINDOW_DAYS - 1));

  const inRange = (r: DrawRow, from: string, to: string) =>
    r.draw_date >= from && r.draw_date <= to;
  const week = rows.filter((r) => inRange(r, weekStart, today));
  const month = rows.filter((r) => inRange(r, monthStart, today));

  const perDay = new Map<string, number>();
  for (const r of week)
    perDay.set(r.draw_date, (perDay.get(r.draw_date) ?? 0) + 1);

  const perSentence = new Map<string, number>();
  for (const r of month)
    perSentence.set(r.sentence_id, (perSentence.get(r.sentence_id) ?? 0) + 1);

  return {
    weekDraws: week.length,
    prevWeekDraws: rows.filter((r) =>
      inRange(r, prevStart, shiftDate(weekStart, -1))
    ).length,
    weekDrawers: new Set(week.map((r) => r.user_id)).size,
    monthDrawers: new Set(month.map((r) => r.user_id)).size,
    daily: Array.from({ length: DAILY_DAYS }, (_, i) => {
      const date = shiftDate(weekStart, i);
      return {
        date,
        label: `${date.slice(5, 7)}/${date.slice(8, 10)}`,
        count: perDay.get(date) ?? 0,
      };
    }),
    // 횟수가 같으면 id 순 — 새로고침마다 순서가 바뀌지 않게
    top: [...perSentence.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, TOP_N)
      .map(([sentenceId, count]) => ({ sentenceId, count })),
  };
};
