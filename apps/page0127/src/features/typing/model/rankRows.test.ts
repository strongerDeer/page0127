import { describe, expect, it } from 'vitest';

import { placeFor } from './rankRows';

import type { TypingRankRow } from '@/entities/typing';

const row = (value: number, isMe = false): TypingRankRow => ({
  nickname: '책**',
  isMe,
  isGuest: false,
  value,
  pageKey: null,
  isMobile: false,
});

describe('placeFor — 이 타수면 몇 위', () => {
  it('빈 랭킹이면 1위', () => {
    expect(placeFor([], 120)).toEqual({ rank: 1, gapToNext: null });
  });

  it('남보다 높은 값만 세고, 바로 위와의 차이를 준다', () => {
    const rows = [row(400), row(320), row(250)];
    expect(placeFor(rows, 300)).toEqual({ rank: 3, gapToNext: 20 });
    expect(placeFor(rows, 500)).toEqual({ rank: 1, gapToNext: null });
  });

  it('같은 타수면 같은 순위', () => {
    expect(placeFor([row(400), row(300)], 300).rank).toBe(2);
  });

  it('내 줄은 빼고 비교한다', () => {
    expect(placeFor([row(400, true), row(300)], 350).rank).toBe(1);
  });

  it('목록이 꽉 찼는데 끝보다 낮으면 순위를 모른다', () => {
    const rows = [row(300), row(200)];
    expect(placeFor(rows, 100, 2)).toEqual({ rank: null, gapToNext: null });
    expect(placeFor(rows, 250, 2).rank).toBe(2);
  });
});
