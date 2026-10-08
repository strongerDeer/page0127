import { describe, expect, it } from 'vitest';

import { crossedBudgetThreshold, toBudgetAlertText } from './budgetAlert';

// 예산 $10 = 1000센트
const BUDGET = 1000;

describe('crossedBudgetThreshold', () => {
  it('이번 호출로 80% 를 넘으면 80 을 돌려준다', () => {
    expect(
      crossedBudgetThreshold({
        beforeCents: 796,
        afterCents: 800,
        budgetCents: BUDGET,
      })
    ).toBe(80);
  });

  it('이미 80% 를 넘은 뒤의 호출은 다시 알리지 않는다', () => {
    expect(
      crossedBudgetThreshold({
        beforeCents: 800,
        afterCents: 804,
        budgetCents: BUDGET,
      })
    ).toBeNull();
  });

  it('이번 호출로 100% 에 닿으면 100 을 돌려준다', () => {
    expect(
      crossedBudgetThreshold({
        beforeCents: 996,
        afterCents: 1000,
        budgetCents: BUDGET,
      })
    ).toBe(100);
  });

  it('한 번에 두 기준을 넘으면 높은 쪽 하나만 알린다', () => {
    expect(
      crossedBudgetThreshold({
        beforeCents: 700,
        afterCents: 1010,
        budgetCents: BUDGET,
      })
    ).toBe(100);
  });

  it('기준 아래에서 움직이면 알리지 않는다', () => {
    expect(
      crossedBudgetThreshold({
        beforeCents: 0,
        afterCents: 4,
        budgetCents: BUDGET,
      })
    ).toBeNull();
  });

  it('예산이 0 이하면 판정하지 않는다', () => {
    expect(
      crossedBudgetThreshold({ beforeCents: 0, afterCents: 4, budgetCents: 0 })
    ).toBeNull();
  });
});

describe('toBudgetAlertText', () => {
  it('80% 경고에는 사용액·예산·원화 환산이 들어간다', () => {
    const text = toBudgetAlertText({
      threshold: 80,
      spentCents: 800,
      budgetCents: BUDGET,
      usdToKrw: 1400,
    });
    expect(text).toContain('80%');
    expect(text).toContain('$8.00 / $10.00');
    expect(text).toContain('11,200원');
  });

  it('100% 알림은 AI 분석이 닫혔다고 말한다', () => {
    const text = toBudgetAlertText({
      threshold: 100,
      spentCents: 1000,
      budgetCents: BUDGET,
      usdToKrw: 1400,
    });
    expect(text).toContain('100%');
    expect(text).toContain('닫혔');
  });
});
