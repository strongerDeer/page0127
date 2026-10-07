import { describe, expect, it } from 'vitest';

import { toTopBooks } from './topBooks';

const STORAGE = 'https://abc.supabase.co';

describe('toTopBooks', () => {
  it('RPC 행을 표지·제목·횟수로 옮긴다', () => {
    expect(
      toTopBooks(
        [
          {
            isbn: '1',
            count: 5,
            book_info: {
              title: '책',
              cover_image: 'https://image.yes24.com/goods/1/L',
            },
          },
        ],
        STORAGE
      )
    ).toEqual([
      {
        isbn: '1',
        title: '책',
        cover: 'https://image.yes24.com/goods/1/L',
        coverFallback: null,
        count: 5,
      },
    ]);
  });

  it('Storage 사본과 상품번호가 있으면 YES24 가 먼저, 사본은 대체용이다', () => {
    const copy = `${STORAGE}/storage/v1/object/public/book-covers/1/cover.jpg`;
    const [book] = toTopBooks(
      [
        {
          isbn: '1',
          count: 5,
          book_info: {
            title: '책',
            cover_image: copy,
            provider_item_id: '13137546',
          },
        },
      ],
      STORAGE
    );
    expect(book.cover).toBe('https://image.yes24.com/goods/13137546');
    expect(book.coverFallback).toBe(copy);
  });

  it('그릴 수 없는 호스트의 표지는 비운다 — 랭킹 카드 하나로 페이지가 500 이 되지 않게', () => {
    const [book] = toTopBooks(
      [
        {
          isbn: '2',
          count: 3,
          book_info: {
            title: '옛 책',
            cover_image: 'https://image.aladin.co.kr/x.jpg',
          },
        },
      ],
      STORAGE
    );
    expect(book.cover).toBeNull();
  });

  it('제목이 없는 행은 뺀다 — 이름 없는 순위는 읽히지 않는다', () => {
    expect(
      toTopBooks([{ isbn: '3', count: 1, book_info: null }], STORAGE)
    ).toEqual([]);
  });

  it('count 가 문자열(bigint)로 와도 숫자로 바꾼다', () => {
    const [book] = toTopBooks(
      [{ isbn: '4', count: '7', book_info: { title: '책' } }],
      STORAGE
    );
    expect(book.count).toBe(7);
  });
});
