import { describe, expect, it } from 'vitest';

import { formatDrawDay, groupDrawsByMonth } from './drawMonths';

import type { DailySentence } from '@/entities/daily-sentence';

const draw = (draw_date: string): DailySentence => ({
  draw_date,
  sentence_id: draw_date,
  text: '문장',
  book_title: '책',
  author: null,
  translator: null,
  page: null,
  isbn: null,
  cover_image: null,
});

describe('groupDrawsByMonth', () => {
  it('최신 달이 위, 달 안에서도 최신 날짜가 위', () => {
    const months = groupDrawsByMonth([
      draw('2026-10-30'),
      draw('2026-11-02'),
      draw('2026-11-10'),
      draw('2025-12-31'),
    ]);

    expect(months.map((m) => m.label)).toEqual([
      '2026년 11월',
      '2026년 10월',
      '2025년 12월',
    ]);
    expect(months[0]?.draws.map((d) => d.draw_date)).toEqual([
      '2026-11-10',
      '2026-11-02',
    ]);
  });

  it('기록이 없으면 빈 배열', () => {
    expect(groupDrawsByMonth([])).toEqual([]);
  });
});

describe('formatDrawDay', () => {
  it('앞자리 0 을 떼고 월·일로', () => {
    expect(formatDrawDay('2026-01-05')).toBe('1월 5일');
  });
});
