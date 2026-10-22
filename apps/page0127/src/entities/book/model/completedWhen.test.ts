import { describe, expect, it } from 'vitest';

import {
  formatCompletedWhen,
  getCompletedPrecision,
  getCompletedYear,
  isValidCompletedYear,
} from './completedWhen';

const dated = { completed_date: '2024-03-01', completed_year: null };
const yearOnly = { completed_date: null, completed_year: 2015 };
const unknown = { completed_date: null, completed_year: null };

describe('completedWhen', () => {
  it('정밀도를 날짜 → 연도 → 모름 순으로 판정한다', () => {
    expect(getCompletedPrecision(dated)).toBe('date');
    expect(getCompletedPrecision(yearOnly)).toBe('year');
    expect(getCompletedPrecision(unknown)).toBe('unknown');
  });

  it('완독 연도는 날짜에서 먼저, 없으면 연도 컬럼에서 읽는다', () => {
    expect(getCompletedYear(dated)).toBe(2024);
    expect(getCompletedYear(yearOnly)).toBe(2015);
    expect(getCompletedYear(unknown)).toBeNull();
  });

  it('표시 문자열', () => {
    expect(formatCompletedWhen(dated)).toBe('2024-03-01');
    expect(formatCompletedWhen(yearOnly)).toBe('2015년');
    expect(formatCompletedWhen(unknown)).toBeNull();
  });

  it('연도는 1900년부터 올해까지만 받는다', () => {
    expect(isValidCompletedYear(2015, 2026)).toBe(true);
    expect(isValidCompletedYear(2026, 2026)).toBe(true);
    expect(isValidCompletedYear(2027, 2026)).toBe(false);
    expect(isValidCompletedYear(1899, 2026)).toBe(false);
    expect(isValidCompletedYear(2015.5, 2026)).toBe(false);
  });
});
