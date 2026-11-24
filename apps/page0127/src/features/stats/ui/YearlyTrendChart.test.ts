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
    expect(withGoals(data, goals).map((d) => d.goal)).toEqual([
      undefined,
      30,
      24,
    ]);
  });
});

describe('withGoals 달성 여부', () => {
  it('채운 해는 달성, 올해 못 채움은 진행 중, 지난해 못 채움은 미달성', () => {
    const past = [
      { year: 2024, count: 10 },
      { year: 2025, count: 41 },
      { year: 2026, count: 19 },
    ];
    const g = [
      { year: 2024, target: 20 },
      { year: 2025, target: 30 },
      { year: 2026, target: 24 },
    ];
    expect(withGoals(past, g, 2026).map((d) => d.status)).toEqual([
      'missed',
      'met',
      'inProgress',
    ]);
    // 표시 높이는 완독·목표 중 높은 쪽
    expect(withGoals(past, g, 2026).map((d) => d.labelTop)).toEqual([
      20, 41, 24,
    ]);
  });
});
