import { describe, expect, it } from 'vitest';

import {
  budgetBasisCents,
  computeBudgetUsage,
  formatKrw,
  formatUsd,
  mergeDailyCosts,
  sumCents,
} from './cost';

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

describe('budgetBasisCents', () => {
  it('실제 청구액이 있으면 앱 기록보다 큰 쪽 — 로컬·테스트 비용이 더해진 실제 청구가 보통 더 크다', () => {
    expect(budgetBasisCents(4, 10)).toBe(10);
  });
  it('실제 청구가 아직 덜 잡혔으면(반영 지연) 앱 기록 — 방금 쓴 운영 비용을 놓치지 않게', () => {
    expect(budgetBasisCents(4, 1)).toBe(4);
  });
  it('실제 청구를 못 읽었으면(null) 앱 기록만', () => {
    expect(budgetBasisCents(4, null)).toBe(4);
  });
});

describe('mergeDailyCosts', () => {
  it('실제 청구에 아직 없는 오늘의 운영 기록도 남긴다', () => {
    expect(
      mergeDailyCosts(
        [
          { date: '2026-10-07', cents: 4 },
          { date: '2026-10-25', cents: 4 },
        ],
        [
          { date: '2026-10-07', cents: 3 },
          { date: '2026-10-18', cents: 2 },
        ]
      )
    ).toEqual([
      { date: '2026-10-07', appCents: 4, actualCents: 3 },
      { date: '2026-10-18', appCents: 0, actualCents: 2 },
      { date: '2026-10-25', appCents: 4, actualCents: 0 },
    ]);
  });

  it('실제 청구를 못 읽으면 actualCents 는 null', () => {
    expect(mergeDailyCosts([{ date: '2026-10-25', cents: 4 }], null)).toEqual([
      { date: '2026-10-25', appCents: 4, actualCents: null },
    ]);
  });
});
