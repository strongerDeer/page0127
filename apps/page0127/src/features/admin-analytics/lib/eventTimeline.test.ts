import { describe, expect, it } from 'vitest';

import {
  CATALOG_EVENTS,
  heatDays,
  heatLevel,
  MAX_HEAT_DAYS,
  parseDailyEvents,
  parseEventTotals,
  parseHourlyEvents,
  parseRealtimeEvents,
} from './eventTimeline';

import type { DateRange } from '@/shared/lib/admin/dateRange';

const range = (from: string, to: string, days: number): DateRange => ({
  preset: 'custom',
  from,
  to,
  days,
  includesToday: false,
  label: '',
});

const row = (dims: string[], ...metrics: number[]) => ({
  dimensionValues: dims.map((value) => ({ value })),
  metricValues: metrics.map((m) => ({ value: String(m) })),
});

const find = (groups: ReturnType<typeof parseDailyEvents>, name: string) =>
  groups.flatMap((g) => g.rows).find((r) => r.name === name);

describe('eventTimeline', () => {
  it('목록의 이벤트 이름은 겹치지 않는다', () => {
    const names = CATALOG_EVENTS.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('긴 기간은 끝에서 31일만 칸으로 그린다', () => {
    const days = heatDays(range('2026-01-01', '2026-03-31', 90));
    expect(days).toHaveLength(MAX_HEAT_DAYS);
    expect(days.at(-1)).toBe('2026-03-31');
    expect(heatDays(range('2026-11-20', '2026-11-26', 7))).toHaveLength(7);
  });

  it('날짜 칸: 0건인 날도 칸을 깔고, 목록에 없는 날은 버린다', () => {
    const days = ['2026-11-25', '2026-11-26'];
    const groups = parseDailyEvents(
      [
        row(['typing_start', '20261126'], 3),
        row(['typing_start', '20261101'], 9),
      ],
      days
    );
    expect(find(groups, 'typing_start')).toMatchObject({
      counts: [0, 3],
      total: 3,
    });
    expect(find(groups, 'daily_sentence_draw')?.counts).toEqual([0, 0]);
  });

  it('시간 칸: 앞 24칸 어제, 뒤 24칸 오늘', () => {
    const groups = parseHourlyEvents(
      [
        row(['sign_up', '2026112514'], 1),
        row(['sign_up', '2026112609'], 2),
        row(['sign_up', '2026112409'], 5), // 그제는 버린다
      ],
      '2026-11-26'
    );
    const r = find(groups, 'sign_up');
    expect(r?.counts).toHaveLength(48);
    expect(r?.counts[14]).toBe(1);
    expect(r?.counts[24 + 9]).toBe(2);
    expect(r?.total).toBe(3);
  });

  it('진하기는 줄의 최댓값 기준 0~4', () => {
    expect(heatLevel(0, 10)).toBe(0);
    expect(heatLevel(1, 10)).toBe(1);
    expect(heatLevel(6, 10)).toBe(3);
    expect(heatLevel(10, 10)).toBe(4);
  });

  it('실시간: 이름을 화면 이름으로 바꾸고 많은 순', () => {
    expect(
      parseRealtimeEvents([
        row(['typing_start'], 1),
        row(['typing_page_complete'], 4),
      ])
    ).toEqual([
      { name: 'typing_page_complete', label: '쪽 완료', count: 4 },
      { name: 'typing_start', label: '필사 시작', count: 1 },
    ]);
  });

  it('합계: GA 가 안 준 이벤트도 0 으로 채운다', () => {
    expect(
      parseEventTotals(
        [row(['typing_start'], 5, 3)],
        ['typing_start', 'typing_rank_join']
      )
    ).toEqual({
      typing_start: { count: 5, users: 3 },
      typing_rank_join: { count: 0, users: 0 },
    });
  });
});
