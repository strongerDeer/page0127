import { dedupeReadings } from './dedupeReadings';
import { getSeoulToday } from './libraryPeriod';
import { toShelfBookKey } from './shelfCounts';

import type { Book } from '../types';

export type PastSelfRow = Pick<
  Book,
  | 'id'
  | 'user_id'
  | 'isbn'
  | 'status'
  | 'is_public'
  | 'completed_date'
  | 'completed_year'
  | 'created_at'
  | 'read_count'
  | 'is_life_book'
  | 'page_count'
>;
export type PastSelfPeriod = 'month' | 'year';
export type BattleRange = { from: string; to: string };
export type PastSelfStats = BattleRange & {
  completedBooks: number;
  totalPages: number;
  missingPageBooks: number;
  undatedBooks: number;
};
export type PastSelfHistory = {
  asOf: string;
  month: { current: PastSelfStats; previous: PastSelfStats };
  year: { current: PastSelfStats; previous: PastSelfStats };
};

const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const key = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const lastDay = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

/** 같은 달력 날짜까지 비교하고, 없는 날짜만 그 달의 말일로 맞춘다. */
export const getPastSelfRanges = (today: string) => {
  if (!validDate(today)) throw new Error('비교 날짜를 확인할 수 없습니다.');
  const [year, month, day] = today.split('-').map(Number);
  const previousMonth = month === 1 ? 12 : month - 1,
    previousMonthYear = month === 1 ? year - 1 : year;
  return {
    month: {
      current: { from: key(year, month, 1), to: today },
      previous: {
        from: key(previousMonthYear, previousMonth, 1),
        to: key(
          previousMonthYear,
          previousMonth,
          Math.min(day, lastDay(previousMonthYear, previousMonth))
        ),
      },
    },
    year: {
      current: { from: key(year, 1, 1), to: today },
      previous: {
        from: key(year - 1, 1, 1),
        to: key(year - 1, month, Math.min(day, lastDay(year - 1, month))),
      },
    },
  };
};

export const calculatePastSelfHistory = (
  rows: PastSelfRow[],
  userId: string,
  today = getSeoulToday()
): PastSelfHistory => {
  const ranges = getPastSelfRanges(today);
  const visible = rows.filter(
    (row) =>
      row.user_id === userId && row.is_public && row.status === 'completed'
  );
  const stats = (range: BattleRange): PastSelfStats => {
    // 먼저 기간을 고른 뒤 서재의 대표 회독 선택 규칙을 그대로 사용한다.
    const readings = dedupeReadings(
      visible.filter(
        (row) =>
          row.completed_date &&
          validDate(row.completed_date) &&
          row.completed_date >= range.from &&
          row.completed_date <= range.to
      )
    );
    const known = new Set(readings.map(toShelfBookKey));
    const undated = new Set(
      visible
        .filter(
          (row) =>
            !row.completed_date &&
            row.completed_year === Number(range.from.slice(0, 4)) &&
            !known.has(toShelfBookKey(row))
        )
        .map(toShelfBookKey)
    );
    return {
      ...range,
      completedBooks: readings.length,
      totalPages: readings.reduce((sum, row) => sum + (row.page_count ?? 0), 0),
      missingPageBooks: readings.filter((row) => row.page_count === null)
        .length,
      undatedBooks: undated.size,
    };
  };
  return {
    asOf: today,
    month: {
      current: stats(ranges.month.current),
      previous: stats(ranges.month.previous),
    },
    year: {
      current: stats(ranges.year.current),
      previous: stats(ranges.year.previous),
    },
  };
};

export const getDefaultPastSelfPeriod = (
  history: PastSelfHistory
): PastSelfPeriod =>
  history.month.previous.completedBooks > 0
    ? 'month'
    : history.year.previous.completedBooks > 0
      ? 'year'
      : 'month';
