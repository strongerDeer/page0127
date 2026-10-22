import type { Book } from '../types';

/**
 * 완독 시점을 얼마나 정확히 아는가.
 *
 * - date    완독 날짜를 안다 (completed_date)
 * - year    연도만 안다 (completed_year) — 인생책처럼 오래전에 읽은 책
 * - unknown 언제 읽었는지 모른다 — 전체 통계에만 들어간다
 *
 * 두 컬럼은 DB CHECK 로 함께 찰 수 없다(20261022000002). 그래도 날짜를 먼저 본다.
 */
export type CompletedPrecision = 'date' | 'year' | 'unknown';

type CompletedWhen = Pick<Book, 'completed_date' | 'completed_year'>;

export const getCompletedPrecision = (
  book: CompletedWhen
): CompletedPrecision => {
  if (book.completed_date) return 'date';
  if (book.completed_year) return 'year';
  return 'unknown';
};

/** 완독 연도. 날짜도 연도도 없으면 null — 어느 연도 책장에도 넣지 않는다 */
export const getCompletedYear = (book: CompletedWhen): number | null => {
  if (book.completed_date) {
    const year = Number(book.completed_date.slice(0, 4));
    return Number.isInteger(year) && year > 0 ? year : null;
  }
  return book.completed_year ?? null;
};

/** 화면 표시용: '2024-03-01' · '2015년' · null(모름) */
export const formatCompletedWhen = (book: CompletedWhen): string | null => {
  if (book.completed_date) return book.completed_date;
  if (book.completed_year) return `${book.completed_year}년`;
  return null;
};

/** 연도만 기록할 때 받을 수 있는 범위 — DB CHECK 와 아래쪽을 맞춘다 */
export const MIN_COMPLETED_YEAR = 1900;

export const isValidCompletedYear = (
  year: number,
  currentYear: number
): boolean =>
  Number.isInteger(year) && year >= MIN_COMPLETED_YEAR && year <= currentYear;
