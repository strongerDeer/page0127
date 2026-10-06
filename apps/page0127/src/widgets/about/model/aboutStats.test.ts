import { describe, expect, it } from 'vitest';

import { shouldShowStats, STATS_MIN, toAboutStats } from './aboutStats';

describe('shouldShowStats', () => {
  it('조회 실패(null)면 숨긴다 — 숫자 섹션 하나 때문에 페이지가 깨지면 안 된다', () => {
    expect(shouldShowStats(null)).toBe(false);
  });

  it('책과 리더가 둘 다 기준 이상일 때만 보인다', () => {
    expect(
      shouldShowStats({
        books: STATS_MIN.books,
        readers: STATS_MIN.readers,
        matches: 0,
      })
    ).toBe(true);
    expect(
      shouldShowStats({ books: STATS_MIN.books - 1, readers: 500, matches: 9 })
    ).toBe(false);
    expect(
      shouldShowStats({
        books: 9999,
        readers: STATS_MIN.readers - 1,
        matches: 9,
      })
    ).toBe(false);
  });
});

describe('toAboutStats', () => {
  it('bigint 가 문자열로 와도 숫자로 바꾼다', () => {
    expect(
      toAboutStats({ books: '1284', readers: '153', matches: '412' })
    ).toEqual({
      books: 1284,
      readers: 153,
      matches: 412,
    });
  });

  it('행이 없으면 null', () => {
    expect(toAboutStats(undefined)).toBeNull();
  });
});
