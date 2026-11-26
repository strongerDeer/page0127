import { describe, expect, it } from 'vitest';

import { monthGrid, shiftMonth } from './monthGrid';

describe('monthGrid', () => {
  it('2026년 11월은 1일이 일요일이라 앞에 빈칸 6개', () => {
    const grid = monthGrid('2026-11');
    expect(grid.slice(0, 7)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      '2026-11-01',
    ]);
    expect(grid.at(-1)).toBe('2026-11-30');
    expect(grid.filter(Boolean)).toHaveLength(30);
  });

  it('1일이 월요일이면 빈칸 없음(2026년 6월)', () => {
    expect(monthGrid('2026-06')[0]).toBe('2026-06-01');
  });

  it('윤년 2월은 29일까지', () => {
    expect(monthGrid('2028-02').at(-1)).toBe('2028-02-29');
  });
});

describe('shiftMonth', () => {
  it('해를 넘나든다', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
});
