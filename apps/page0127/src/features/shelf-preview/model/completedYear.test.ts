import { describe, expect, it } from 'vitest';

import {
  getCompletedYearError,
  toClaimedBookUpdate,
  toCompletedYear,
} from './completedYear';

describe('toCompletedYear', () => {
  it('올해·작년은 기준 연도로 계산한다', () => {
    expect(toCompletedYear('this', '', 2026)).toBe(2026);
    expect(toCompletedYear('last', '', 2026)).toBe(2025);
  });

  it('모름은 저장하지 않는다', () => {
    expect(toCompletedYear('unknown', '2015', 2026)).toBeNull();
  });

  it('직접 입력은 1900 ~ 올해만 받는다', () => {
    expect(toCompletedYear('custom', '2015', 2026)).toBe(2015);
    expect(toCompletedYear('custom', ' 1900 ', 2026)).toBe(1900);
    expect(toCompletedYear('custom', '1899', 2026)).toBeNull();
    expect(toCompletedYear('custom', '2027', 2026)).toBeNull();
  });

  it('비었거나 숫자가 아니거나 소수면 저장하지 않는다', () => {
    expect(toCompletedYear('custom', '', 2026)).toBeNull();
    expect(toCompletedYear('custom', '이천십오', 2026)).toBeNull();
    expect(toCompletedYear('custom', '2015.5', 2026)).toBeNull();
  });
});

describe('toClaimedBookUpdate', () => {
  it('연도도 별점도 없으면 보낼 게 없다', () => {
    expect(toClaimedBookUpdate(null, null)).toBeNull();
  });

  it('연도만 고르면 날짜를 비우고 연도를 남긴다', () => {
    expect(toClaimedBookUpdate(2024, null)).toEqual({
      completed_year: 2024,
      completed_date: null,
    });
  });

  it('별점만 고르면 별점만 보낸다 — 완독 연도는 모름 그대로', () => {
    expect(toClaimedBookUpdate(null, 4)).toEqual({ rating: 4 });
  });

  it('둘 다 고르면 함께 보낸다', () => {
    expect(toClaimedBookUpdate(2025, 5)).toEqual({
      completed_year: 2025,
      completed_date: null,
      rating: 5,
    });
  });
});

describe('getCompletedYearError', () => {
  it.each(['1800', '2027', '2015.5', '이천십오'])(
    '잘못된 직접 입력 %s에는 범위를 안내한다',
    (input) => {
      expect(getCompletedYearError('custom', input, 2026)).toContain(
        '1900년부터 2026년'
      );
    }
  );

  it('직접 입력을 비웠으면 모름 선택으로 빠져나갈 수 있게 안내한다', () => {
    expect(getCompletedYearError('custom', '  ', 2026)).toContain('모름');
  });

  it.each(['1900', '2026', ' 2015 '])(
    '정상 연도 %s는 저장할 수 있다',
    (input) => {
      expect(getCompletedYearError('custom', input, 2026)).toBeNull();
    }
  );

  it('모름·올해·작년으로 바꾸면 남아 있는 잘못된 직접 입력은 막지 않는다', () => {
    for (const choice of ['unknown', 'this', 'last'] as const) {
      expect(getCompletedYearError(choice, '1800', 2026)).toBeNull();
    }
  });
});
