import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearPendingShelf,
  MAX_PENDING_BOOKS,
  parsePendingShelf,
  PENDING_SHELF_KEY,
  PENDING_SHELF_TTL_MS,
  readPendingShelf,
  writePendingShelf,
} from './pendingShelf';

import type { PendingBook } from './types';

const book = (isbn: string): PendingBook => ({
  isbn,
  provider_item_id: null,
  title: `책 ${isbn}`,
  author: null,
  publisher: null,
  cover_image: null,
  spine_image: null,
  pub_date: null,
  category: null,
  source: null,
});

const NOW = 1_760_000_000_000;

const memoryStorage = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parsePendingShelf', () => {
  it('정상 형식을 그대로 돌려준다', () => {
    const raw = { v: 1, savedAt: NOW, books: [book('1')], goal: null };
    expect(parsePendingShelf(raw, NOW)).toEqual(raw);
  });

  it('목표만 있는 형식도 받는다', () => {
    const raw = {
      v: 1,
      savedAt: NOW,
      books: [],
      goal: { year: 2026, target: 12 },
    };
    expect(parsePendingShelf(raw, NOW)?.goal).toEqual({
      year: 2026,
      target: 12,
    });
  });

  it('24시간이 지나면 버린다', () => {
    const raw = {
      v: 1,
      savedAt: NOW - PENDING_SHELF_TTL_MS - 1,
      books: [book('1')],
      goal: null,
    };
    expect(parsePendingShelf(raw, NOW)).toBeNull();
  });

  it('버전·형식이 틀리면 버린다', () => {
    expect(parsePendingShelf(null, NOW)).toBeNull();
    expect(parsePendingShelf('x', NOW)).toBeNull();
    expect(
      parsePendingShelf({ v: 2, savedAt: NOW, books: [], goal: null }, NOW)
    ).toBeNull();
    expect(
      parsePendingShelf(
        { v: 1, savedAt: NOW, books: [{ isbn: 1 }], goal: null },
        NOW
      )
    ).toBeNull();
  });

  it(`${MAX_PENDING_BOOKS}권을 넘으면 버린다`, () => {
    const books = Array.from({ length: MAX_PENDING_BOOKS + 1 }, (_, i) =>
      book(String(i))
    );
    expect(
      parsePendingShelf({ v: 1, savedAt: NOW, books, goal: null }, NOW)
    ).toBeNull();
  });

  it('목표가 범위를 벗어나면 버린다', () => {
    expect(
      parsePendingShelf(
        { v: 1, savedAt: NOW, books: [], goal: { year: 2026, target: 0 } },
        NOW
      )
    ).toBeNull();
    expect(
      parsePendingShelf(
        { v: 1, savedAt: NOW, books: [], goal: { year: 2026, target: 1001 } },
        NOW
      )
    ).toBeNull();
  });

  it('책도 목표도 없으면 담을 것이 없으니 null', () => {
    expect(
      parsePendingShelf({ v: 1, savedAt: NOW, books: [], goal: null }, NOW)
    ).toBeNull();
  });
});

describe('read/write/clear', () => {
  it('쓰고 읽고 지운다', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    expect(writePendingShelf({ books: [book('1')], goal: null }, NOW)).toBe(
      true
    );
    expect(readPendingShelf(NOW)?.books).toHaveLength(1);
    clearPendingShelf();
    expect(readPendingShelf(NOW)).toBeNull();
  });

  it('형식이 깨진 값은 읽을 때 지운다', () => {
    const storage = memoryStorage();
    storage.setItem(PENDING_SHELF_KEY, '{not json');
    vi.stubGlobal('localStorage', storage);
    expect(readPendingShelf(NOW)).toBeNull();
    expect(storage.getItem(PENDING_SHELF_KEY)).toBeNull();
  });

  it('저장소가 던져도 예외 없이 false', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    });
    expect(writePendingShelf({ books: [book('1')], goal: null }, NOW)).toBe(
      false
    );
    expect(readPendingShelf(NOW)).toBeNull();
    expect(() => clearPendingShelf()).not.toThrow();
  });
});

describe('lifeBookIsbn (히어로 B 의 인생책)', () => {
  it('보관분 안의 책을 가리키면 그대로 읽는다', () => {
    const raw = {
      v: 1,
      savedAt: NOW,
      books: [book('1'), book('2')],
      goal: null,
      lifeBookIsbn: '1',
    };
    expect(parsePendingShelf(raw, NOW)?.lifeBookIsbn).toBe('1');
  });

  it('없는 책이나 문자열이 아닌 값이면 인생책 표시만 버리고 보관분은 살린다', () => {
    const base = { v: 1, savedAt: NOW, books: [book('1')], goal: null };
    const missing = parsePendingShelf({ ...base, lifeBookIsbn: '9' }, NOW);
    const wrongType = parsePendingShelf({ ...base, lifeBookIsbn: 1 }, NOW);

    expect(missing?.books).toHaveLength(1);
    expect(missing && 'lifeBookIsbn' in missing).toBe(false);
    expect(wrongType?.books).toHaveLength(1);
    expect(wrongType && 'lifeBookIsbn' in wrongType).toBe(false);
  });

  it('쓸 때도 상한으로 잘려 나간 책을 가리키면 남기지 않는다', () => {
    const storage = memoryStorage();
    vi.stubGlobal('localStorage', storage);
    const books = Array.from({ length: MAX_PENDING_BOOKS + 1 }, (_, i) =>
      book(String(i))
    );

    writePendingShelf(
      { books, goal: null, lifeBookIsbn: String(MAX_PENDING_BOOKS) },
      NOW
    );
    const saved = JSON.parse(storage.getItem(PENDING_SHELF_KEY) ?? '{}');

    expect(saved.books).toHaveLength(MAX_PENDING_BOOKS);
    expect('lifeBookIsbn' in saved).toBe(false);
  });
});
