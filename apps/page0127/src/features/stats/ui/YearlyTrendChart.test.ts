import { describe, expect, it } from 'vitest';

import { withGoals } from './YearlyTrendChart';

const data = [
  { year: 2024, count: 55 },
  { year: 2025, count: 41 },
  { year: 2026, count: 19 },
];
const goals = [
  { year: 2025, target: 30 },
  { year: 2026, target: 24 },
];

describe('withGoals', () => {
  it('그 해 목표를 막대에 붙인다 — 목표가 없던 해는 비운다', () => {
    expect(withGoals(data, goals, true)).toEqual([
      { year: 2024, count: 55, goal: undefined },
      { year: 2025, count: 41, goal: 30 },
      { year: 2026, count: 19, goal: 24 },
    ]);
  });

  it('방문자에겐 채운 목표만 — 못 채운 해의 목표는 숨긴다', () => {
    expect(withGoals(data, goals, false).map((d) => d.goal)).toEqual([
      undefined,
      30,
      undefined,
    ]);
  });
});
