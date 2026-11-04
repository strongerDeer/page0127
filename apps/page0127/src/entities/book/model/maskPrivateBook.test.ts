import { describe, expect, it } from 'vitest';

import { dedupeReadings } from './dedupeReadings';
import { maskPrivateBooks, mergeByCompletedDate } from './maskPrivateBook';

import type { Book } from '../types';

const row = (isbn: string, completed_date: string | null, read_count = 1) => ({
  isbn,
  status: 'completed' as const,
  read_count,
  completed_date,
  completed_year: null,
  created_at: '2026-01-01T00:00:00Z',
});

describe('maskPrivateBooks', () => {
  it('진짜 id·ISBN·제목을 남기지 않는다', () => {
    const [book] = maskPrivateBooks([row('9791190000000', '2026-11-01')], 'u1');

    expect(book.id).toBe('private-0');
    expect(book.isbn).toBe('private-0');
    expect(book.title).toBe('비공개 도서');
    expect(book.cover_image).toBeNull();
    expect(book.category).toBeNull();
    expect(book.rating).toBeNull();
    expect(book.is_public).toBe(false);
    expect(book.is_masked).toBe(true);
    expect(JSON.stringify(book)).not.toContain('9791190000000');
  });

  it('같은 책 재독은 같은 가린 ISBN 을 받아 책장에서 한 권으로 합쳐진다', () => {
    const books = maskPrivateBooks(
      [row('A', '2026-03-01', 1), row('A', '2026-10-01', 2), row('B', null)],
      'u1'
    );

    expect(books.map((b) => b.isbn)).toEqual([
      'private-0',
      'private-0',
      'private-1',
    ]);
    expect(dedupeReadings(books)).toHaveLength(2);
  });
});

describe('mergeByCompletedDate', () => {
  it('완독일 최신순, 날짜 모르는 책이 앞', () => {
    const pub = [
      { id: 'p1', completed_date: '2026-05-01' },
      { id: 'p2', completed_date: '2026-01-01' },
    ] as Book[];
    const masked = [
      { id: 'm1', completed_date: '2026-03-01' },
      { id: 'm2', completed_date: null },
    ] as Book[];

    expect(mergeByCompletedDate(pub, masked).map((b) => b.id)).toEqual([
      'm2',
      'p1',
      'm1',
      'p2',
    ]);
  });
});
