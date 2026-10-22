import { describe, expect, it } from 'vitest';

import { readingDayCount, readingSince } from './readingSince';

describe('readingSince', () => {
  it('시작일이 있으면 그대로', () => {
    expect(
      readingSince({
        start_date: '2026-10-08',
        created_at: '2026-10-01T00:00:00Z',
      })
    ).toBe('2026-10-08');
  });

  it('없으면 서재에 담은 날(KST) — UTC 밤 9시 이후는 다음 날', () => {
    expect(
      readingSince({ start_date: null, created_at: '2026-10-07T16:00:00Z' })
    ).toBe('2026-10-08');
  });
});

describe('readingDayCount', () => {
  it('시작한 날이 1일째', () => {
    expect(readingDayCount('2026-10-22', '2026-10-22')).toBe(1);
    expect(readingDayCount('2026-10-08', '2026-10-22')).toBe(15);
  });

  it('달을 넘어도 센다', () => {
    expect(readingDayCount('2026-09-30', '2026-10-01')).toBe(2);
  });

  it('미래 시작일(입력 실수)은 1로 막는다', () => {
    expect(readingDayCount('2026-10-30', '2026-10-22')).toBe(1);
  });
});
