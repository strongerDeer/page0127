import { describe, expect, it, vi } from 'vitest';

import {
  claimPendingBooks,
  isCurrentYearGoal,
  shouldClaimGoal,
  toBookInput,
  toClaimToast,
  toKstYear,
} from './claim';

import type { PendingBook } from './types';

const book = (isbn: string, over: Partial<PendingBook> = {}): PendingBook => ({
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
  ...over,
});

describe('toBookInput', () => {
  it('완독으로 담고, null 은 생략(undefined)으로 바꾼다 — BookInput 의 선택 필드는 string 만 받는다', () => {
    expect(
      toBookInput(
        book('1', { author: '한강', provider_item_id: '9', spine_image: null })
      )
    ).toEqual({
      isbn: '1',
      title: '1',
      provider_item_id: '9',
      source: null,
      author: '한강',
      publisher: undefined,
      cover_image: undefined,
      spine_image: null,
      pub_date: undefined,
      category: undefined,
      status: 'completed',
    });
  });
});

describe('claimPendingBooks', () => {
  it('이미 서재에 있는 책은 건너뛴다 — 기존 사용자가 이 흐름으로 로그인한 경우', async () => {
    const create = vi.fn(async () => undefined);
    const result = await claimPendingBooks([book('a'), book('b')], {
      findExisting: async (b) => b.isbn === 'a',
      create,
    });
    expect(result).toEqual({ added: 1, skipped: 1, failed: 0 });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('한 권이 실패해도 나머지는 담는다', async () => {
    const result = await claimPendingBooks([book('a'), book('b'), book('c')], {
      findExisting: async () => false,
      create: async (b) => {
        if (b.isbn === 'b') throw new Error('500');
      },
    });
    expect(result).toEqual({ added: 2, skipped: 0, failed: 1 });
  });

  it('고른 순서대로 담는다(활동 기록 순서)', async () => {
    const order: string[] = [];
    await claimPendingBooks([book('a'), book('b')], {
      findExisting: async () => false,
      create: async (b) => void order.push(b.isbn),
    });
    expect(order).toEqual(['a', 'b']);
  });
});

describe('shouldClaimGoal', () => {
  it('비어 있으면 넣는다 — null, 컬럼 기본값 {}, target 없음', () => {
    expect(shouldClaimGoal(null, 2026)).toBe(true);
    expect(shouldClaimGoal({}, 2026)).toBe(true);
    expect(shouldClaimGoal({ year: 2026 }, 2026)).toBe(true);
  });

  it('지난해 목표만 있으면 올해 것을 넣는다', () => {
    expect(shouldClaimGoal({ year: 2025, target: 30 }, 2026)).toBe(true);
  });

  it('올해 목표가 이미 있으면 덮지 않는다', () => {
    expect(shouldClaimGoal({ year: 2026, target: 30 }, 2026)).toBe(false);
  });
});

describe('toKstYear', () => {
  it('서버(UTC)가 아직 12/31 이어도 한국이 1/1 이면 새해다', () => {
    expect(toKstYear(new Date('2026-12-31T15:00:00Z'))).toBe(2027);
    expect(toKstYear(new Date('2026-12-31T14:59:59Z'))).toBe(2026);
  });
});

describe('isCurrentYearGoal', () => {
  it('보관한 해와 지금 해가 다르면 넣지 않는다 — 12/31 에 고르고 1/1 에 로그인', () => {
    const now = new Date('2027-01-01T03:00:00Z'); // KST 2027-01-01 12:00
    expect(isCurrentYearGoal({ year: 2026, target: 12 }, now)).toBe(false);
    expect(isCurrentYearGoal({ year: 2027, target: 12 }, now)).toBe(true);
  });
});

describe('toClaimToast', () => {
  it('담은 것만 말한다', () => {
    expect(toClaimToast(3, false)).toBe('3권을 서재에 꽂았어요.');
    expect(toClaimToast(0, true)).toBe('올해 독서 목표를 정했어요.');
    expect(toClaimToast(2, true)).toBe(
      '2권을 서재에 꽂고 올해 독서 목표를 정했어요.'
    );
    expect(toClaimToast(0, false)).toBeNull();
  });
});
