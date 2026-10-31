import { describe, expect, it } from 'vitest';

import { parseDateRange, previousRange } from '@/shared/lib/admin/dateRange';

import {
  FUNNEL_EVENTS,
  HERO_AB_STEPS,
  parseCtaLocations,
  parseEvents,
  parseHeroAb,
  toEventsRequest,
  toHeroAbRequest,
} from './gaEvents';

const row = (dims: string[], metrics: number[]) => ({
  dimensionValues: dims.map((value) => ({ value })),
  metricValues: metrics.map((m) => ({ value: String(m) })),
});

describe('toEventsRequest', () => {
  it('현재·이전 기간을 이름 붙여 한 번에 묻는다', () => {
    const r = parseDateRange({ range: '7d' }, new Date('2026-10-21T03:00:00Z'));
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

describe('toHeroAbRequest', () => {
  it('같은 기간 하나만 묻고, 이벤트 × 사용자 속성 hero_variant 로 나눈다', () => {
    const r = parseDateRange({ range: '7d' }, new Date('2026-10-21T03:00:00Z'));
    const req = toHeroAbRequest(r);
    expect(req.dateRanges).toEqual([
      { startDate: '2026-10-15', endDate: '2026-10-21' },
    ]);
    expect(req.dimensions).toEqual([
      { name: 'eventName' },
      { name: 'customUser:hero_variant' },
    ]);
  });
});

describe('parseHeroAb', () => {
  it('단계 순서대로 A·B 사용자 수를 돌려주고, 빠진 단계는 0', () => {
    const out = parseHeroAb([
      row(['shelf_preview_view', 'a'], [40]),
      row(['shelf_preview_view', 'b'], [38]),
      row(['shelf_preview_save', 'b'], [9]),
    ]);
    expect(out.map((s) => s.name)).toEqual(HERO_AB_STEPS.map((s) => s.name));
    expect(out[0]).toMatchObject({ a: 40, b: 38 });
    expect(out.find((s) => s.name === 'shelf_preview_save')).toMatchObject({
      a: 0,
      b: 9,
    });
  });

  it('그룹이 없는 사용자((not set) — 실험 밖)는 세지 않는다', () => {
    const out = parseHeroAb([
      row(['login_start', '(not set)'], [100]),
      row(['login_start', 'a'], [3]),
    ]);
    expect(out.find((s) => s.name === 'login_start')).toMatchObject({
      a: 3,
      b: 0,
    });
  });

  it('응답이 비면 모두 0', () => {
    expect(parseHeroAb([]).every((s) => s.a === 0 && s.b === 0)).toBe(true);
  });
});
