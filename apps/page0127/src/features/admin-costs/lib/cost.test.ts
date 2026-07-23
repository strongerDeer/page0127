import { describe, expect, it } from 'vitest';

import { computeBudgetUsage, formatKrw, formatUsd, sumCents } from './cost';

describe('sumCents', () => {
  it('null은 0으로 취급해 합산', () => {
    expect(
      sumCents([
        { cost_in_cents: 120 },
        { cost_in_cents: null },
        { cost_in_cents: 80 },
      ])
    ).toBe(200);
  });
  it('빈 배열은 0', () => {
    expect(sumCents([])).toBe(0);
  });
});

describe('computeBudgetUsage', () => {
  it('센트→달러→원 환산과 퍼센트', () => {
    // 820센트 = $8.20, ×1400 = 11480원, / 30000 = 38%
    const u = computeBudgetUsage(820, { usdToKrw: 1400, budgetKrw: 30000 });
    expect(u.usd).toBeCloseTo(8.2);
    expect(u.krw).toBe(11480);
    expect(u.percent).toBe(38);
  });
  it('예산이 0이면 percent 0', () => {
    expect(
      computeBudgetUsage(100, { usdToKrw: 1400, budgetKrw: 0 }).percent
    ).toBe(0);
  });
});

describe('format', () => {
  it('달러는 소수 2자리', () => {
    expect(formatUsd(8.2)).toBe('$8.20');
  });
  it('원은 천단위 콤마', () => {
    expect(formatKrw(11480)).toBe('₩11,480');
  });
});
