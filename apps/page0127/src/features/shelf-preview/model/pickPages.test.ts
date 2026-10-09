import { describe, expect, it } from 'vitest';

import { PICKS_PER_PAGE, toPickPages } from './pickPages';

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

const many = (count: number) =>
  Array.from({ length: count }, (_, i) => pick(String(i)));

describe('toPickPages', () => {
  it(`${PICKS_PER_PAGE}권씩 나눈다 — 24권이면 3묶음`, () => {
    const pages = toPickPages(many(24));
    expect(pages).toHaveLength(3);
    expect(pages.every((p) => p.length === PICKS_PER_PAGE)).toBe(true);
    expect(pages[1][0].book.isbn).toBe('8');
  });

  it('마지막 묶음은 모자라도 그대로 둔다 — DB 에 일부만 있을 때', () => {
    expect(toPickPages(many(10)).map((p) => p.length)).toEqual([8, 2]);
  });

  it('한 권도 없으면 묶음도 없다', () => {
    expect(toPickPages([])).toEqual([]);
  });
});
