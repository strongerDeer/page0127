import { describe, expect, it } from 'vitest';

import { dailyScore, isDailyScoreTotal } from './dailyScore';

describe('dailyScore', () => {
  it('같은 날·같은 사람이면 늘 같은 점수', () => {
    expect(dailyScore('2026-11-24', 'user-1')).toEqual(
      dailyScore('2026-11-24', 'user-1')
    );
  });

  it('세부 셋은 70~99, 총점은 그 평균', () => {
    for (let i = 0; i < 200; i += 1) {
      const { total, items } = dailyScore('2026-11-24', `seed-${i}`);
      expect(items.map((item) => item.label)).toEqual([
        '몰입운',
        '발견운',
        '문장운',
      ]);
      for (const { value } of items) {
        expect(value).toBeGreaterThanOrEqual(70);
        expect(value).toBeLessThanOrEqual(99);
      }
      const avg = items.reduce((s, x) => s + x.value, 0) / 3;
      expect(total).toBe(Math.round(avg));
    }
  });

  it('사람이 다르거나 날이 다르면 대개 다른 점수', () => {
    const people = new Set(
      Array.from({ length: 50 }, (_, i) =>
        dailyScore('2026-11-24', `p${i}`)
          .items.map((x) => x.value)
          .join()
      )
    );
    expect(people.size).toBeGreaterThan(40);
    const days = new Set(
      Array.from({ length: 30 }, (_, i) =>
        dailyScore(`2026-11-${String(i + 1).padStart(2, '0')}`, 'me')
          .items.map((x) => x.value)
          .join()
      )
    );
    expect(days.size).toBeGreaterThan(25);
  });

  it('총점에 맞는 한 줄이 붙는다', () => {
    const { comment } = dailyScore('2026-11-24', 'user-1');
    expect(comment.length).toBeGreaterThan(0);
  });

  it('공유 주소의 점수는 70~99 정수만 받는다', () => {
    expect(isDailyScoreTotal(70)).toBe(true);
    expect(isDailyScoreTotal(99)).toBe(true);
    expect(isDailyScoreTotal(69)).toBe(false);
    expect(isDailyScoreTotal(100)).toBe(false);
    expect(isDailyScoreTotal(85.5)).toBe(false);
    expect(isDailyScoreTotal(Number.NaN)).toBe(false);
  });
});
