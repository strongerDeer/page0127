import { describe, expect, it } from 'vitest';

import { addPendingBook } from './addPendingBook';
import { MAX_PENDING_BOOKS } from './pendingShelf';

import type { PendingShelf } from './pendingShelf';
import type { PendingBook } from './types';

const book = (isbn: string, itemId: string | null = null): PendingBook => ({
  isbn,
  provider_item_id: itemId,
  title: isbn,
  author: null,
  publisher: null,
  cover_image: null,
  spine_image: null,
  pub_date: null,
  category: null,
  source: null,
});

const shelf = (over: Partial<PendingShelf>): PendingShelf => ({
  v: 1,
  savedAt: 0,
  books: [],
  goal: null,
  ...over,
});

describe('addPendingBook', () => {
  it('보관분이 없으면 그 책 한 권으로 시작한다', () => {
    expect(addPendingBook(null, book('a'))).toEqual({
      books: [book('a')],
      goal: null,
    });
  });

  it('맛보기에서 고른 책 뒤에 더한다 — 덮어쓰지 않는다', () => {
    const result = addPendingBook(shelf({ books: [book('a')] }), book('b'));
    expect(result.books.map((b) => b.isbn)).toEqual(['a', 'b']);
  });

  it('같은 책이면 더하지 않는다 — isbn 이 달라도 상품번호가 같으면 같은 책', () => {
    const result = addPendingBook(
      shelf({ books: [book('8936434594', '108422348')] }),
      book('9788936434595', '108422348')
    );
    expect(result.books).toHaveLength(1);
  });

  it('정해 둔 목표는 그대로 들고 간다', () => {
    const goal = { year: 2026, target: 12 };
    expect(addPendingBook(shelf({ goal }), book('a')).goal).toEqual(goal);
  });

  it(`${MAX_PENDING_BOOKS}권이 차 있으면 더하지 않는다`, () => {
    const full = Array.from({ length: MAX_PENDING_BOOKS }, (_, i) =>
      book(String(i))
    );
    expect(
      addPendingBook(shelf({ books: full }), book('x')).books
    ).toHaveLength(MAX_PENDING_BOOKS);
  });
});

describe('addPendingBook — 히어로 B 의 인생책', () => {
  it('"나도 읽었어요"로 책을 더해도 인생책 표시를 잃지 않는다', () => {
    const result = addPendingBook(
      shelf({ books: [book('life')], lifeBookIsbn: 'life' }),
      book('b')
    );
    expect(result.lifeBookIsbn).toBe('life');
    expect(result.books.map((b) => b.isbn)).toEqual(['life', 'b']);
  });
});
