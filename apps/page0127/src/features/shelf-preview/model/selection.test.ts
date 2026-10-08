import { describe, expect, it } from 'vitest';

import { isSameBook, toggleSelection } from './selection';

import type { ShelfPick } from './types';

const pick = (isbn: string): ShelfPick => ({
  book: {
    isbn,
    provider_item_id: null,
    title: isbn,
    author: null,
    publisher: null,
    cover_image: null,
    spine_image: null,
    pub_date: null,
    category: null,
    source: null,
  },
  coverSrc: null,
  coverFallback: null,
  spineSrc: null,
});

const isbns = (list: ShelfPick[]) => list.map((p) => p.book.isbn);

describe('toggleSelection', () => {
  it('없으면 뒤에 붙인다(고른 순서대로 꽂힌다)', () => {
    expect(isbns(toggleSelection([pick('a')], pick('b'), 20))).toEqual([
      'a',
      'b',
    ]);
  });

  it('같은 isbn 이면 뺀다 — 목록과 검색에서 같은 책을 골라도 한 번만', () => {
    const fromSearch = {
      ...pick('a'),
      coverSrc: 'https://image.yes24.com/goods/1/L',
    };
    expect(
      isbns(toggleSelection([pick('a'), pick('b')], fromSearch, 20))
    ).toEqual(['b']);
  });

  it('isbn 이 달라도 상품번호가 같으면 같은 책이다 — 목록은 ISBN10·K코드, 검색은 ISBN13', () => {
    const fromPicks = {
      ...pick('8936434594'),
      book: { ...pick('8936434594').book, provider_item_id: '108422348' },
    };
    const fromSearch = {
      ...pick('9788936434595'),
      book: { ...pick('9788936434595').book, provider_item_id: '108422348' },
    };
    expect(toggleSelection([fromPicks], fromSearch, 20)).toEqual([]);
    expect(isSameBook(fromPicks.book, fromSearch.book)).toBe(true);
  });

  it('상품번호가 둘 다 없으면 isbn 으로만 판단한다', () => {
    expect(isSameBook(pick('a').book, pick('b').book)).toBe(false);
  });

  it('상한이면 더 붙이지 않는다(빼기는 된다)', () => {
    expect(isbns(toggleSelection([pick('a')], pick('b'), 1))).toEqual(['a']);
    expect(toggleSelection([pick('a')], pick('a'), 1)).toEqual([]);
  });
});
