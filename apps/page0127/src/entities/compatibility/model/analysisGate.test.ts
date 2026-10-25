import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { countPublicCompatibilityBooks } from './analysisGate';

describe('공개 케미 조건', () => {
  it('다른 해의 공개 완독도 세고 보관·미완독·평가 없는 책은 제외한다', () => {
    const valid = Array.from({ length: 5 }, () =>
      createTestBook({ rating: 4, completed_date: '2020-01-01' })
    );
    const books = [
      ...valid,
      createTestBook({ rating: 5, is_public: false }),
      createTestBook({ rating: null }),
      createTestBook({ rating: 5, status: 'reading' }),
    ];
    expect(countPublicCompatibilityBooks(books)).toBe(5);
    expect(countPublicCompatibilityBooks([])).toBe(0);
  });
});
