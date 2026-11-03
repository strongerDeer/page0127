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
    expect(books.map((b) => b.book.isbn)).toEqual(['1', '2', '3', '4', '5']);
    expect(books[0]).toMatchObject({ book: { title: '책 1' } });
  });

  it('표지가 없는 책은 빼고 센다', () => {
    const rows = [row('1'), row('2', null), row('3'), row('4')];
    expect(toLeaderLifeBooks(rows, STORAGE).map((b) => b.book.isbn)).toEqual([
      '1',
      '3',
      '4',
    ]);
  });

  it('표지를 빼고 나서 3권 미만이면 숨긴다', () => {
    const rows = [row('1'), row('2', null), row('3')];
    expect(toLeaderLifeBooks(rows, STORAGE)).toEqual([]);
  });

  it('누르면 그대로 저장할 수 있게 책 정보를 DB 원본 그대로 든다', () => {
    const rows = ['1', '2', '3'].map((i) => ({
      isbn: i,
      book_info: {
        title: `책 ${i}`,
        cover_image: `${STORAGE}/c/${i}.jpg`,
        provider_item_id: '777',
        author: '저자',
        publisher: '출판사',
        spine_image: null,
        pub_date: '2020-01-01',
        category: '소설',
        source: 'yes24',
      },
    }));
    const [first] = toLeaderLifeBooks(rows, STORAGE);
    expect(first?.book).toEqual({
      isbn: '1',
      provider_item_id: '777',
      title: '책 1',
      author: '저자',
      publisher: '출판사',
      cover_image: `${STORAGE}/c/1.jpg`,
      spine_image: null,
      pub_date: '2020-01-01',
      category: '소설',
      source: 'yes24',
    });
  });
});
