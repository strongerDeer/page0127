import { toKstDateKey } from '@/shared/lib/date';

/** 홈 추이 차트가 보는 기간 */
export const TREND_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type TrendPoint = {
  /** KST 날짜 (YYYY-MM-DD) */
  date: string;
  /** 축 표기 'MM/DD' */
  label: string;
  count: number;
};

/** 추이의 첫날(KST) — 어제를 마지막 날로 하는 days 일 구간 */
export const trendStart = (now: Date, days = TREND_DAYS): string =>
  toKstDateKey(new Date(now.getTime() - days * DAY_MS));

/**
 * 날짜 키 목록을 날짜별 개수로 접는다. 하루도 빠짐없이 칸을 깐다.
 *
 * DB 에서 날짜별 count 를 받으면 **0건인 날은 행이 없다**. 그대로 그리면 빈 날이
 * 사라져 막대가 붙고, "3일 쉬었다"가 안 보인다. 그래서 기간 전체를 먼저 깔고 센다.
 * 오늘은 아직 안 끝난 날이라 넣지 않는다(period.ts 의 "끝난 날끼리 비교" 원칙).
 *
 * @param dateKeys KST 날짜 키 배열 — timestamptz 는 호출부에서 toKstDateKey 로 바꿔 넘긴다
 */
export const bucketByDay = (
  dateKeys: string[],
  now: Date,
  days = TREND_DAYS
): TrendPoint[] => {
  const counts = new Map<string, number>();
  for (const key of dateKeys) counts.set(key, (counts.get(key) ?? 0) + 1);

  const points: TrendPoint[] = [];
  for (let i = days; i >= 1; i--) {
    const date = toKstDateKey(new Date(now.getTime() - i * DAY_MS));
    points.push({
      date,
      label: `${date.slice(5, 7)}/${date.slice(8, 10)}`,
      count: counts.get(date) ?? 0,
    });
  }
  return points;
};

/** 기간 합계 */
export const sumPoints = (points: TrendPoint[]): number =>
  points.reduce((a, p) => a + p.count, 0);
