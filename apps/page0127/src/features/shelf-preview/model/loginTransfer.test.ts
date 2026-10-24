import { describe, expect, it } from 'vitest';

import { toBookInput } from './claim';
import {
  encodeShelfTransfer,
  parseShelfTransfer,
  toPendingLoginPath,
} from './loginTransfer';
import { parsePendingShelf, PENDING_SHELF_TTL_MS } from './pendingShelf';
import { preferLocalSelection, resolveTransfer } from './resolveTransfer';

import type { PendingBook } from './types';

const now = 1_760_000_000_000;
const book: PendingBook = {
  isbn: '9788936434267',
  provider_item_id: '108422348',
  title: '책',
  author: '저자',
  publisher: null,
  cover_image: null,
  spine_image: null,
  pub_date: null,
  category: null,
  source: 'yes24',
};

describe('다른 브라우저에서 로그인 이어가기', () => {
  it('재조회가 실패해도 같은 브라우저의 원본 선택은 잃지 않는다', async () => {
    const selection = parseShelfTransfer(
      encodeShelfTransfer({ books: [book], goal: null }, now),
      now
    )!;
    const failed = await resolveTransfer(selection, async () => null);
    const local = { v: 1 as const, savedAt: now, books: [book], goal: null };
    expect(preferLocalSelection(failed, local)).toMatchObject({
      pending: local,
      failed: 0,
    });
    expect(
      preferLocalSelection(failed, {
        ...local,
        books: [{ ...book, isbn: 'other' }],
      }).failed
    ).toBe(1);
  });
  it('저장소가 비어 있어도 링크로 책·목표·인생책을 복원한다', async () => {
    const path = toPendingLoginPath(
      {
        books: [book],
        goal: { year: 2026, target: 12 },
        lifeBookIsbn: book.isbn,
      },
      '/books/all',
      now
    );
    const url = new URL(path, 'https://page0127.com');
    const transfer = parseShelfTransfer(url.searchParams.get('shelf')!, now)!;
    const result = await resolveTransfer(transfer, async () => book);
    expect(result.failed).toBe(0);
    expect(parsePendingShelf(result.pending, now)).toMatchObject({
      books: [{ isbn: book.isbn }],
      goal: { year: 2026, target: 12 },
      lifeBookIsbn: book.isbn,
    });
    expect(url.searchParams.get('redirect')).toBe('/books/all');
    const decoded = atob(
      url.searchParams.get('shelf')!.replace(/-/g, '+').replace(/_/g, '/')
    );
    expect(decoded).not.toContain(book.title);
    expect(decoded).not.toContain(book.author);
  });

  it('일반 담기는 읽고 싶은 책으로, 나도 읽었어요는 완독으로 이어진다', async () => {
    const token = encodeShelfTransfer(
      { books: [{ ...book, status: 'want_to_read' }], goal: null },
      now
    );
    const result = await resolveTransfer(
      parseShelfTransfer(token, now)!,
      async () => book
    );
    expect(toBookInput(result.pending!.books[0]).status).toBe('want_to_read');
    const read = await resolveTransfer(
      parseShelfTransfer(
        encodeShelfTransfer({ books: [book], goal: null }, now),
        now
      )!,
      async () => book
    );
    expect(toBookInput(read.pending!.books[0]).status).toBe('completed');
  });

  it('조회 실패를 조용히 버리지 않고 실패 권수를 알리며 나머지는 유지한다', async () => {
    const second = { ...book, isbn: '9788937462672' };
    const transfer = parseShelfTransfer(
      encodeShelfTransfer({ books: [book, second], goal: null }, now),
      now
    )!;
    const result = await resolveTransfer(transfer, async (ref) => {
      if (ref.isbn === second.isbn) throw new Error('공급자 일시 오류');
      return book;
    });
    expect(result.failed).toBe(1);
    expect(result.pending?.books).toHaveLength(1);
  });

  it('상품번호로 찾은 ISBN이 달라도 인생책 표시는 복원된 책을 가리킨다', async () => {
    const transfer = parseShelfTransfer(
      encodeShelfTransfer(
        { books: [book], goal: null, lifeBookIsbn: book.isbn },
        now
      ),
      now
    )!;
    const result = await resolveTransfer(transfer, async () => ({
      ...book,
      isbn: '9788937462672',
    }));
    expect(result.pending?.lifeBookIsbn).toBe('9788937462672');
  });

  it('목표만 있는 링크도 책 조회 없이 복원한다', async () => {
    const transfer = parseShelfTransfer(
      encodeShelfTransfer({ books: [], goal: { year: 2026, target: 24 } }, now),
      now
    )!;
    const result = await resolveTransfer(transfer, async () => {
      throw new Error('호출되면 안 됨');
    });
    expect(result.pending?.goal?.target).toBe(24);
    expect(result.failed).toBe(0);
  });

  it('만료·미래 시각·손상·과도한 길이·유효하지 않은 식별자는 거부한다', () => {
    const token = encodeShelfTransfer({ books: [book], goal: null }, now);
    expect(
      parseShelfTransfer(token, now + PENDING_SHELF_TTL_MS + 1)
    ).toBeNull();
    expect(parseShelfTransfer(token, now - 60_001)).toBeNull();
    expect(parseShelfTransfer('broken-token', now)).toBeNull();
    expect(parseShelfTransfer('a'.repeat(4097), now)).toBeNull();
    expect(() =>
      encodeShelfTransfer(
        { books: [{ ...book, isbn: '../other' }], goal: null },
        now
      )
    ).toThrow();
    expect(() =>
      encodeShelfTransfer({ books: Array(21).fill(book), goal: null }, now)
    ).toThrow();
  });

  it('외부 복귀 주소는 링크에 넣지 않는다', () => {
    const path = toPendingLoginPath(
      { books: [book], goal: null },
      '//evil.test',
      now
    );
    expect(
      new URL(path, 'https://page0127.com').searchParams.has('redirect')
    ).toBe(false);
  });
});
