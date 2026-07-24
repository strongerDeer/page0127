import { describe, expect, it } from 'vitest';

import { median } from './lighthouse';

describe('median', () => {
  it('빈 배열은 0', () => {
    expect(median([])).toBe(0);
  });

  it('단일 표본은 그 값', () => {
    expect(median([42])).toBe(42);
  });

  it('홀수 표본은 가운데 값', () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it('짝수 표본은 두 가운데의 평균(반올림)', () => {
    expect(median([1, 2, 3, 4])).toBe(3); // (2+3)/2 = 2.5 → 3
  });

  it('LCP 노이즈(11.6/37.9/17.6s)에서 극단 38s에 휘둘리지 않는다', () => {
    expect(median([11600, 37900, 17600])).toBe(17600);
  });
});
