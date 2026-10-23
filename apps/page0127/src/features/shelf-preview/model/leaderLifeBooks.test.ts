import { describe, expect, it } from 'vitest';

import { toLeaderLifeBooks } from './leaderLifeBooks';

import type { LeaderLifeBookRow } from './leaderLifeBooks';

const STORAGE = 'https://example.supabase.co';

const row = (isbn: string, cover: string | null = `${STORAGE}/c/${isbn}.jpg`) =>
  ({
    isbn,
    book_info: {
      title: `책 ${isbn}`,
      cover_image: cover,
      provider_item_id: null,
    },
  }) satisfies LeaderLifeBookRow;

describe('toLeaderLifeBooks', () => {
  it('3권 미만이면 줄을 숨긴다(빈 목록)', () => {
    expect(toLeaderLifeBooks([row('1'), row('2')], STORAGE)).toEqual([]);
    expect(toLeaderLifeBooks([], STORAGE)).toEqual([]);
  });

  it('3권 이상이면 순서대로 최대 5권', () => {
    const rows = ['1', '2', '3', '4', '5', '6'].map((i) => row(i));
    const books = toLeaderLifeBooks(rows, STORAGE);
    expect(books.map((b) => b.isbn)).toEqual(['1', '2', '3', '4', '5']);
    expect(books[0]).toMatchObject({ title: '책 1' });
  });

  it('표지가 없는 책은 빼고 센다', () => {
    const rows = [row('1'), row('2', null), row('3'), row('4')];
    expect(toLeaderLifeBooks(rows, STORAGE).map((b) => b.isbn)).toEqual([
      '1',
      '3',
      '4',
    ]);
  });

  it('표지를 빼고 나서 3권 미만이면 숨긴다', () => {
    const rows = [row('1'), row('2', null), row('3')];
    expect(toLeaderLifeBooks(rows, STORAGE)).toEqual([]);
  });
});
