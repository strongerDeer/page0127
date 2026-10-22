import { describe, expect, it } from 'vitest';

import { parseDateRange, previousRange } from '@/shared/lib/admin/dateRange';

import {
  FUNNEL_EVENTS,
  parseCtaLocations,
  parseEvents,
  toEventsRequest,
} from './gaEvents';

const row = (dims: string[], metrics: number[]) => ({
  dimensionValues: dims.map((value) => ({ value })),
  metricValues: metrics.map((m) => ({ value: String(m) })),
});

describe('toEventsRequest', () => {
  it('현재·이전 기간을 이름 붙여 한 번에 묻는다', () => {
    const r = parseDateRange({ range: '7d' }, new Date('2026-10-22T03:00:00Z'));
    const req = toEventsRequest(r, previousRange(r));
    expect(req.dateRanges).toEqual([
      { startDate: '2026-10-15', endDate: '2026-10-21', name: 'current' },
      { startDate: '2026-10-08', endDate: '2026-10-14', name: 'previous' },
    ]);
  });
});

describe('parseEvents', () => {
  it('dateRange 열로 현재/이전을 가르고, 빠진 이벤트는 0 으로 채운다', () => {
    const out = parseEvents([
      row(['signup_start', 'current'], [10, 8]),
      row(['signup_start', 'previous'], [4, 3]),
      row(['sign_up', 'current'], [2, 2]),
    ]);
    expect(out).toHaveLength(FUNNEL_EVENTS.length);
    const start = out.find((e) => e.name === 'signup_start');
    expect(start?.count).toEqual({ current: 10, previous: 4 });
    expect(start?.users).toEqual({ current: 8, previous: 3 });
    expect(out.find((e) => e.name === 'book_add')?.count).toEqual({
      current: 0,
      previous: 0,
    });
  });
});

describe('parseCtaLocations', () => {
  it('위치별로 묶고 현재 기간 많은 순', () => {
    const out = parseCtaLocations([
      row(['library_bottom', 'current'], [1]),
      row(['library_chemi', 'current'], [5]),
      row(['library_chemi', 'previous'], [2]),
      row(['(not set)', 'current'], [0]),
    ]);
    expect(out.map((r) => r.location)).toEqual([
      'library_chemi',
      'library_bottom',
      '(알 수 없음)',
    ]);
    expect(out[0].count).toEqual({ current: 5, previous: 2 });
  });
});
