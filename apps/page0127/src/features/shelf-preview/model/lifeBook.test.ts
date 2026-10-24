import { describe, expect, it } from 'vitest';

import { withLifeBook } from './lifeBook';
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

describe('withLifeBook', () => {
  it('보관분이 없으면 그 한 권을 인생책으로 시작한다', () => {
    expect(withLifeBook(null, book('a'))).toEqual({
      books: [book('a')],
      goal: null,
      lifeBookIsbn: 'a',
    });
  });

  it('"나도 읽었어요"로 담아 둔 책·목표는 두고 인생책을 맨 앞에 둔다', () => {
    const goal = { year: 2026, target: 12 };
    const result = withLifeBook(shelf({ books: [book('x')], goal }), book('a'));
    expect(result.books.map((b) => b.isbn)).toEqual(['a', 'x']);
    expect(result.goal).toEqual(goal);
  });

  it('이미 담긴 같은 책이면 두 번 넣지 않는다 — 상품번호가 같으면 같은 책', () => {
    const result = withLifeBook(
      shelf({ books: [book('8936434594', '108422348')] }),
      book('9788936434595', '108422348')
    );
    expect(result.books.map((b) => b.isbn)).toEqual(['9788936434595']);
  });

  it('전에 고른 인생책은 뺀다 — 읽은 책으로 남기지 않는다', () => {
    const result = withLifeBook(
      shelf({ books: [book('old'), book('x')], lifeBookIsbn: 'old' }),
      book('new')
    );
    expect(result.books.map((b) => b.isbn)).toEqual(['new', 'x']);
    expect(result.lifeBookIsbn).toBe('new');
  });

  it('상한이 차 있어도 인생책은 들어가고 맨 끝 책이 밀려난다', () => {
    const full = Array.from({ length: MAX_PENDING_BOOKS }, (_, i) =>
      book(String(i))
    );
    const result = withLifeBook(shelf({ books: full }), book('life'));
    expect(result.books).toHaveLength(MAX_PENDING_BOOKS);
    expect(result.books[0].isbn).toBe('life');
  });
});
