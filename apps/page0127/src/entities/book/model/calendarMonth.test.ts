import { describe, expect, it } from 'vitest';

import {
  buildCalendarMonth,
  type CalendarMonth,
  getInitialCalendarMonth,
  MAX_LANES,
} from './calendarMonth';
import { createTestBook } from './createTestBook';

const TODAY = '2026-10-13';
const findDay = (m: CalendarMonth, day: number) => {
  const found = m.weeks.flat().find((d) => d?.day === day);
  if (!found) throw new Error(`${day}일이 없다`);
  return found;
};

describe('buildCalendarMonth', () => {
  it('일요일 시작 주 배열 — 2026년 9월 1일은 화요일', () => {
    const m = buildCalendarMonth([], 2026, 9);
    expect(m.weeks[0].slice(0, 2)).toEqual([null, null]);
    expect(m.weeks[0][2]?.date).toBe('2026-09-01');
    expect(m.weeks.flat().filter(Boolean)).toHaveLength(30);
    m.weeks.forEach((week) => expect(week).toHaveLength(7));
  });

  it('완독일 칸에 책이 놓이고, 요약은 공개만 세고 비공개는 따로', () => {
    const pub = createTestBook({
      completed_date: '2026-09-05',
      page_count: 312,
    });
    const priv = createTestBook({
      completed_date: '2026-09-05',
      is_public: false,
      page_count: 200,
    });
    const m = buildCalendarMonth([pub, priv], 2026, 9);
    expect(findDay(m, 5).completions.map((c) => c.book.id)).toEqual([
      pub.id,
      priv.id,
    ]);
    expect(m.summary).toEqual({
      publicCount: 1,
      publicPages: 312,
      privateCount: 1,
    });
  });

  it('완독이 아닌 책·다른 달 책은 완독 칸에 없다', () => {
    const m = buildCalendarMonth(
      [
        createTestBook({ status: 'reading', completed_date: '2026-09-05' }),
        createTestBook({ completed_date: '2026-08-05' }),
      ],
      2026,
      9
    );
    expect(findDay(m, 5).completions).toHaveLength(0);
  });

  it('기간 막대 — 달을 걸치면 이번 달 1일부터, 시작/끝 표시', () => {
    const book = createTestBook({
      start_date: '2026-08-28',
      completed_date: '2026-09-03',
    });
    const m = buildCalendarMonth([book], 2026, 9);
    expect(findDay(m, 1).ranges[0]).toMatchObject({
      lane: 0,
      isStart: false,
      isEnd: false,
    });
    expect(findDay(m, 3).ranges[0]).toMatchObject({ isEnd: true });
    expect(findDay(m, 4).ranges).toHaveLength(0);
    // 같은 책의 완독 표지는 막대와 같은 색
    expect(findDay(m, 3).completions[0].colorIndex).toBe(
      findDay(m, 3).ranges[0].colorIndex
    );
  });

  it('읽는 중인 책은 막대를 그리지 않는다 — 몇 달째 읽는 책이 매달 줄을 채웠다(2026-10-14)', () => {
    const book = createTestBook({
      status: 'reading',
      start_date: '2026-07-26',
    });
    const m = buildCalendarMonth([book], 2026, 10);
    expect(m.weeks.flat().some((d) => (d?.ranges.length ?? 0) > 0)).toBe(false);
  });

  it('시작일이 없거나, 시작>완독이거나, 읽고 싶어요면 막대를 그리지 않는다', () => {
    const m = buildCalendarMonth(
      [
        createTestBook({ completed_date: '2026-09-10' }),
        createTestBook({
          start_date: '2026-09-20',
          completed_date: '2026-09-10',
        }),
        createTestBook({ status: 'want_to_read', start_date: '2026-09-01' }),
      ],
      2026,
      9
    );
    expect(m.weeks.flat().some((d) => (d?.ranges.length ?? 0) > 0)).toBe(false);
    expect(findDay(m, 10).completions[0].colorIndex).toBeNull();
  });

  it('겹치는 기간은 줄을 나누고, 3줄을 넘으면 overflow', () => {
    const books = [1, 2, 3, 4].map((n) =>
      createTestBook({
        start_date: '2026-09-01',
        completed_date: `2026-09-1${n}`,
      })
    );
    const m = buildCalendarMonth(books, 2026, 9);
    const day1 = findDay(m, 1);
    expect(day1.ranges.map((r) => r.lane)).toEqual([0, 1, 2]);
    expect(day1.overflow).toBe(1);
    expect(MAX_LANES).toBe(3);
  });

  it('끝난 줄은 다시 쓴다', () => {
    const a = createTestBook({
      start_date: '2026-09-01',
      completed_date: '2026-09-03',
    });
    const b = createTestBook({
      start_date: '2026-09-05',
      completed_date: '2026-09-07',
    });
    const m = buildCalendarMonth([a, b], 2026, 9);
    expect(findDay(m, 5).ranges[0].lane).toBe(0);
  });

  it('activeMonths — 그 해 공개 완독이 있는 달', () => {
    const m = buildCalendarMonth(
      [
        createTestBook({ completed_date: '2026-01-07' }),
        createTestBook({ completed_date: '2026-05-08' }),
        createTestBook({ completed_date: '2026-06-01', is_public: false }),
        createTestBook({ completed_date: '2025-12-31' }),
      ],
      2026,
      9
    );
    expect(m.activeMonths).toEqual([1, 5]);
  });
});

describe('getInitialCalendarMonth', () => {
  it('올해면 이번 달', () => {
    expect(getInitialCalendarMonth([], 2026, TODAY)).toBe(10);
  });

  it('지난해면 그 해 마지막 완독 달, 없으면 12월', () => {
    const books = [
      createTestBook({ completed_date: '2025-07-03' }),
      createTestBook({ completed_date: '2025-11-29' }),
    ];
    expect(getInitialCalendarMonth(books, 2025, TODAY)).toBe(11);
    expect(getInitialCalendarMonth([], 2024, TODAY)).toBe(12);
  });
});
