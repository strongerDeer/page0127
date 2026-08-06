import { describe, expect, it } from 'vitest';

import {
  kstDateToUtcEnd,
  kstDateToUtcStart,
  resolveMetricPeriod,
} from './period';

describe('resolveMetricPeriod', () => {
  it('KST 기준으로 오늘·어제·7일 시작을 잡는다', () => {
    // 2026-08-06 12:00 KST = 2026-08-06 03:00 UTC
    const now = new Date('2026-08-06T03:00:00Z');
    expect(resolveMetricPeriod(now)).toEqual({
      today: '2026-08-06',
      yesterday: '2026-08-05',
      weekStart: '2026-07-30',
    });
  });

  it('UTC 로는 전날이지만 KST 로는 오늘인 시각을 오늘로 본다', () => {
    // 2026-08-06 08:00 KST = 2026-08-05 23:00 UTC
    // UTC 기준으로 계산하면 today 가 08-05 로 하루 밀린다
    const now = new Date('2026-08-05T23:00:00Z');
    expect(resolveMetricPeriod(now).today).toBe('2026-08-06');
    expect(resolveMetricPeriod(now).yesterday).toBe('2026-08-05');
  });

  it('월이 바뀌는 경계에서도 어제를 제대로 잡는다', () => {
    // 2026-09-01 09:00 KST = 2026-09-01 00:00 UTC
    const now = new Date('2026-09-01T00:00:00Z');
    const period = resolveMetricPeriod(now);
    expect(period.today).toBe('2026-09-01');
    expect(period.yesterday).toBe('2026-08-31');
  });
});

describe('kstDateToUtcStart / End', () => {
  it('KST 자정을 UTC 로 옮긴다 (전날 15:00Z)', () => {
    expect(kstDateToUtcStart('2026-08-06')).toBe('2026-08-05T15:00:00.000Z');
  });

  it('끝은 다음 날 KST 자정이다', () => {
    expect(kstDateToUtcEnd('2026-08-06')).toBe('2026-08-06T15:00:00.000Z');
  });

  it('시작과 끝의 간격은 정확히 하루다', () => {
    const start = new Date(kstDateToUtcStart('2026-08-06')).getTime();
    const end = new Date(kstDateToUtcEnd('2026-08-06')).getTime();
    expect(end - start).toBe(24 * 60 * 60 * 1000);
  });

  it('KST 오전 8시에 만들어진 기록은 그날 범위에 들어간다', () => {
    // 문자열 비교(UTC 기준)로 하면 전날로 새어 나가는 시각이다
    const createdAt = new Date('2026-08-05T23:00:00Z'); // = 08-06 08:00 KST
    const start = new Date(kstDateToUtcStart('2026-08-06'));
    const end = new Date(kstDateToUtcEnd('2026-08-06'));
    expect(createdAt >= start && createdAt < end).toBe(true);
  });
});
