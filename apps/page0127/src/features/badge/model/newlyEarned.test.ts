import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { computeBadges } from './badges';
import { newlyEarnedBadges } from './newlyEarned';

import type { Book } from '@/entities/book';

const done = (date: string, overrides: Partial<Book> = {}) =>
  createTestBook({
    completed_date: date,
    created_at: `${date}T09:00:00Z`,
    ...overrides,
  });

const run = (books: Book[]) =>
  computeBadges({ books, readingGoal: null, firstTasteAnalysisAt: null });

const diff = (before: Book[], after: Book[]) =>
  newlyEarnedBadges(run(before), run(after)).map((badge) => badge.id);

describe('newlyEarnedBadges', () => {
  it('첫 완독이면 책장 1단계를 새로 받는다', () => {
    expect(diff([], [done('2026-03-02')])).toContain('shelf');
  });

  it('이미 받은 단계는 다시 고르지 않는다', () => {
    const first = done('2026-03-02');
    expect(diff([first], [first, done('2026-03-05')])).not.toContain('shelf');
  });

  it('성장 뱃지는 단계가 오르면 다시 고른다', () => {
    const nine = Array.from({ length: 9 }, (_, i) =>
      done(`2026-03-${String(i + 1).padStart(2, '0')}`)
    );
    expect(diff(nine, [...nine, done('2026-03-20')])).toContain('shelf');
  });

  it('지난 날짜로 넣어 근거 책만 바뀌면 새로 받은 것으로 보지 않는다', () => {
    const later = done('2026-03-10');
    const backdated = done('2026-01-01');
    expect(diff([later], [later, backdated])).not.toContain('shelf');
  });

  it('조건을 채운 이야기 뱃지를 고른다', () => {
    expect(diff([], [done('2026-03-02', { page_count: 620 })])).toContain(
      'brick'
    );
  });
});
