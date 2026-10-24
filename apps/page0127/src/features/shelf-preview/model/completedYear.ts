import { isValidCompletedYear, MIN_COMPLETED_YEAR } from '@/entities/book';

import type { BookInput, BookRating } from '@/entities/book';

/**
 * 맛보기로 담은 책의 완독 시점 고르기.
 * 맛보기는 완독일을 지어내지 않으려고 비워 담는다("모름") → 전체 탭에만 들어가고 그해 책장·목표
 * 진행률에는 잡히지 않는다. 담은 직후 연도만 한 번 물어 그 빈칸을 채울 기회를 준다.
 */
export type YearChoice = 'this' | 'last' | 'custom' | 'unknown';

export const YEAR_CHOICES: { value: YearChoice; label: string }[] = [
  { value: 'this', label: '올해' },
  { value: 'last', label: '작년' },
  { value: 'custom', label: '연도 입력' },
  { value: 'unknown', label: '모름' },
];

/**
 * 고른 값 → 저장할 완독 연도. null 이면 저장하지 않는다(모름 그대로).
 * 직접 입력은 1900 ~ 올해만 받는다 — DB CHECK 와 등록 폼(isValidCompletedYear)과 같은 범위.
 */
export const toCompletedYear = (
  choice: YearChoice,
  customInput: string,
  currentYear: number
): number | null => {
  if (choice === 'this') return currentYear;
  if (choice === 'last') return currentYear - 1;
  if (choice === 'custom') {
    const year = Number(customInput.trim());
    return isValidCompletedYear(year, currentYear) ? year : null;
  }
  return null;
};

/** ‘모름’과 잘못된 직접 입력을 구분해, 별점만 조용히 저장되는 것을 막는다. */
export const getCompletedYearError = (
  choice: YearChoice,
  customInput: string,
  currentYear: number
): string | null => {
  if (choice !== 'custom') return null;
  if (!customInput.trim()) return '연도를 입력하거나 모름을 선택해 주세요.';
  return toCompletedYear(choice, customInput, currentYear) === null
    ? `${MIN_COMPLETED_YEAR}년부터 ${currentYear}년 사이의 연도를 정수로 입력해 주세요.`
    : null;
};

/**
 * 한 권의 답 → PATCH 로 보낼 값. 연도도 별점도 없으면 null(보낼 게 없다).
 * 날짜와 연도는 DB CHECK 로 함께 찰 수 없다 — 연도를 쓸 땐 날짜를 비운다.
 */
export const toClaimedBookUpdate = (
  year: number | null,
  rating: BookRating | null
): Partial<BookInput> | null => {
  if (year === null && rating === null) return null;
  return {
    ...(year !== null && { completed_year: year, completed_date: null }),
    ...(rating !== null && { rating }),
  };
};
