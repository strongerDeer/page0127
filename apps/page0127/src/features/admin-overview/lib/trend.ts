import {
  type DateRange,
  listDateKeys,
  shortDate,
} from '@/shared/lib/admin/dateRange';

export type TrendPoint = {
  /** KST 날짜 (YYYY-MM-DD) */
  date: string;
  /** 축 표기 'MM/DD' */
  label: string;
  count: number;
};

/**
 * 날짜 키 목록을 날짜별 개수로 접는다. 하루도 빠짐없이 칸을 깐다.
 *
 * DB 에서 날짜별 count 를 받으면 **0건인 날은 행이 없다**. 그대로 그리면 빈 날이
 * 사라져 막대가 붙고, "3일 쉬었다"가 안 보인다. 그래서 기간 전체를 먼저 깔고 센다.
 * 기간은 항상 어제 이하로 끝난다(dateRange.ts 의 "끝난 날끼리 비교" 원칙).
 *
 * @param dateKeys KST 날짜 키 배열 — timestamptz 는 호출부에서 toKstDateKey 로 바꿔 넘긴다
 */
export const bucketByDay = (
  dateKeys: string[],
  range: DateRange
): TrendPoint[] => {
  const counts = new Map<string, number>();
  for (const key of dateKeys) counts.set(key, (counts.get(key) ?? 0) + 1);

  return listDateKeys(range).map((date) => ({
    date,
    label: shortDate(date),
    count: counts.get(date) ?? 0,
  }));
};

/** 기간 합계 */
export const sumPoints = (points: TrendPoint[]): number =>
  points.reduce((a, p) => a + p.count, 0);
