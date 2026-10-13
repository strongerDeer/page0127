import { describe, expect, it } from 'vitest';

import { createTestBook } from './createTestBook';
import { getSeoulToday, resolveDefaultLibraryYear } from './libraryPeriod';

describe('resolveDefaultLibraryYear', () => {
  it('올해 서재에 책이 있으면 올해', () => {
    const books = [
      createTestBook({ completed_date: '2026-03-01' }),
      createTestBook({ completed_date: '2025-03-01' }),
    ];
    expect(resolveDefaultLibraryYear(books, 2026)).toBe(2026);
  });

  it('올해가 비어 있으면 책이 있는 가장 최근 해', () => {
    const books = [
      createTestBook({ completed_date: '2024-03-01' }),
      createTestBook({ completed_date: '2025-12-31' }),
    ];
    expect(resolveDefaultLibraryYear(books, 2026)).toBe(2025);
  });

  it('읽고 싶어요만 있는 해는 비어 있는 것으로 본다 — 날짜 없는 위시리스트는 항상 올해로 잡히기 때문', () => {
    const books = [
      createTestBook({ status: 'want_to_read' }),
      createTestBook({ completed_date: '2025-05-01' }),
    ];
    expect(resolveDefaultLibraryYear(books, 2026)).toBe(2025);
  });

  it('날짜 없이 읽는 중인 책은 올해 서재에 있다', () => {
    const books = [
      createTestBook({ status: 'reading' }),
      createTestBook({ completed_date: '2025-05-01' }),
    ];
    expect(resolveDefaultLibraryYear(books, 2026)).toBe(2026);
  });

  it('책이 하나도 없으면 올해', () => {
    expect(resolveDefaultLibraryYear([], 2026)).toBe(2026);
  });
});

describe('getSeoulToday', () => {
  it('한국 시간 기준 날짜 문자열을 돌려준다', () => {
    // UTC 15:00 = KST 다음 날 00:00
    expect(getSeoulToday(new Date('2026-12-31T15:00:00.000Z'))).toBe(
      '2027-01-01'
    );
    expect(getSeoulToday(new Date('2026-10-13T03:00:00.000Z'))).toBe(
      '2026-10-13'
    );
  });
});
