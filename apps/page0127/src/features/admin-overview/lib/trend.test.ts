import { describe, expect, it } from 'vitest';

import { parseDateRange } from '@/shared/lib/admin/dateRange';

import { bucketByDay, sumPoints } from './trend';

// KST 10/6 정오 → 어제 = 10/5
const now = new Date('2026-10-06T03:00:00Z');
const range = parseDateRange(
  { range: 'custom', from: '2026-10-01', to: '2026-10-05' },
  now
);

describe('bucketByDay', () => {
  it('기간 전체 칸을 깔고, 0건인 날도 0으로 남긴다', () => {
    const points = bucketByDay(
      ['2026-10-05', '2026-10-05', '2026-10-03'],
      range
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
    const points = bucketByDay(['2026-10-06', '2026-09-01'], range);
    expect(sumPoints(points)).toBe(0);
  });

  it('프리셋 기간은 오늘까지 그 일수만큼 깐다', () => {
    const points = bucketByDay([], parseDateRange({ range: '7d' }, now));
    expect(points).toHaveLength(7);
    expect(points.at(-1)?.date).toBe('2026-10-06');
  });
});
