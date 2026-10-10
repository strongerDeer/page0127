import { describe, expect, it } from 'vitest';

import { toLoginNotice } from './loginNotice';

import type { PendingShelf } from './pendingShelf';
import type { PendingBook } from './types';

const book = (isbn: string): PendingBook => ({
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
});

const shelf = (over: Partial<PendingShelf>): PendingShelf => ({
  v: 1,
  savedAt: 0,
  books: [],
  goal: null,
  ...over,
});

describe('toLoginNotice', () => {
  it('보관분이 없으면 안내도 없다 — 그냥 로그인하러 온 사람', () => {
    expect(toLoginNotice(null)).toBeNull();
  });

  it('고른 책이 있으면 몇 권이 꽂히는지 말한다', () => {
    expect(
      toLoginNotice(shelf({ books: [book('a'), book('b'), book('c')] }))
    ).toBe('로그인하면 고른 3권이 내 서재에 바로 꽂혀요.');
  });

  it('목표만 있으면 목표를 말한다', () => {
    expect(toLoginNotice(shelf({ goal: { year: 2026, target: 12 } }))).toBe(
      '로그인하면 2026년 목표 12권이 저장돼요.'
    );
  });

  it('둘 다 있으면 책을 먼저 말한다 — 화면에서 고른 것이 책이다', () => {
    expect(
      toLoginNotice(
        shelf({ books: [book('a')], goal: { year: 2026, target: 12 } })
      )
    ).toBe('로그인하면 고른 1권이 내 서재에 바로 꽂혀요.');
  });
});
