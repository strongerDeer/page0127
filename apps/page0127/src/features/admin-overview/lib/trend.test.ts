import { describe, expect, it } from 'vitest';

import { bucketByDay, sumPoints, trendStart } from './trend';

// KST 10/6 정오 → 어제 = 10/5
const now = new Date('2026-10-06T03:00:00Z');

describe('bucketByDay', () => {
  it('어제까지 days 칸을 깔고, 0건인 날도 0으로 남긴다', () => {
    const points = bucketByDay(
      ['2026-10-05', '2026-10-05', '2026-10-03'],
      now,
      5
    );
    expect(points.map((p) => [p.date, p.count])).toEqual([
      ['2026-10-01', 0],
      ['2026-10-02', 0],
      ['2026-10-03', 1],
      ['2026-10-04', 0],
      ['2026-10-05', 2],
    ]);
    expect(points[4].label).toBe('10/05');
  });

  it('오늘(진행 중)과 기간 밖 날짜는 세지 않는다', () => {
    const points = bucketByDay(['2026-10-06', '2026-09-01'], now, 5);
    expect(sumPoints(points)).toBe(0);
  });
});

describe('trendStart', () => {
  it('어제를 마지막 날로 하는 구간의 첫날', () => {
    expect(trendStart(now, 5)).toBe('2026-10-01');
  });
});
