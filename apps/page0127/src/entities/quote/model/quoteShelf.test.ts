import { describe, expect, it } from 'vitest';

import { groupQuotesByBook } from './quoteShelf';

import type { QuoteShelfBook } from './quoteShelf';
import type { BookQuote } from './types';

const quote = (id: string, isbn: string, created_at: string): BookQuote => ({
  id,
  isbn,
  text: `문장 ${id}`,
  page: null,
  created_at,
});

const book = (
  id: string,
  isbn: string,
  created_at: string
): QuoteShelfBook => ({
  id,
  isbn,
  title: `책 ${id}`,
  author: null,
  cover_image: null,
  created_at,
});

describe('groupQuotesByBook', () => {
  it('책별로 묶고, 최근에 문장을 적은 책이 위로 온다', () => {
    const groups = groupQuotesByBook(
      [
        quote('a1', 'A', '2026-11-01T00:00:00Z'),
        quote('b1', 'B', '2026-11-03T00:00:00Z'),
        quote('a2', 'A', '2026-11-05T00:00:00Z'),
      ],
      [book('bookA', 'A', '2026-10-01'), book('bookB', 'B', '2026-10-01')]
    );

    expect(groups.map((g) => g.isbn)).toEqual(['A', 'B']);
    expect(groups[0]?.quotes.map((q) => q.id)).toEqual(['a1', 'a2']);
    expect(groups[0]?.lastQuotedAt).toBe('2026-11-05T00:00:00Z');
  });

  it('묶음 안은 적은 순서대로 — 입력 순서와 상관없다', () => {
    const [group] = groupQuotesByBook(
      [
        quote('late', 'A', '2026-11-05T00:00:00Z'),
        quote('early', 'A', '2026-11-01T00:00:00Z'),
      ],
      []
    );
    expect(group?.quotes.map((q) => q.id)).toEqual(['early', 'late']);
  });

  it('회독으로 기록이 여럿이면 가장 최근 기록을 책으로 쓴다', () => {
    const [group] = groupQuotesByBook(
      [quote('a1', 'A', '2026-11-01T00:00:00Z')],
      [
        book('first', 'A', '2025-01-01T00:00:00Z'),
        book('reread', 'A', '2026-06-01T00:00:00Z'),
      ]
    );
    expect(group?.book?.id).toBe('reread');
  });

  it('책 기록을 지웠으면 book 이 null 이고 문장은 남는다', () => {
    const [group] = groupQuotesByBook(
      [quote('a1', 'A', '2026-11-01T00:00:00Z')],
      []
    );
    expect(group?.book).toBeNull();
    expect(group?.quotes).toHaveLength(1);
  });

  it('문장이 없으면 빈 배열', () => {
    expect(groupQuotesByBook([], [book('x', 'X', '2026-01-01')])).toEqual([]);
  });
});
