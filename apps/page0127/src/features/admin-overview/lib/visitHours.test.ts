import { describe, expect, it } from 'vitest';

import { bucketByKstHour, peakHour } from './visitHours';

describe('bucketByKstHour', () => {
  it('UTC 시각을 KST 시로 바꿔 24칸에 센다', () => {
    const points = bucketByKstHour([
      '2026-10-21T12:30:00Z', // KST 21시
      '2026-10-20T12:05:00Z', // KST 21시
      '2026-10-21T15:10:00Z', // KST 다음 날 0시
    ]);
    expect(points).toHaveLength(24);
    expect(points[21]).toEqual({ date: '21', label: '21시', count: 2 });
    expect(points[0].count).toBe(1);
  });

  it('가장 많은 시각, 없으면 null', () => {
    expect(peakHour(bucketByKstHour(['2026-10-21T12:30:00Z']))).toBe(21);
    expect(peakHour(bucketByKstHour([]))).toBeNull();
  });
});
