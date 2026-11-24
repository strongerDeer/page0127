import { describe, expect, it } from 'vitest';

import { type DrawRow, shiftDate, summarizeDraws } from './drawStats';

const today = '2026-11-24';
const row = (
  user_id: string,
  draw_date: string,
  sentence_id = 's1'
): DrawRow => ({
  user_id,
  draw_date,
  sentence_id,
});

describe('summarizeDraws', () => {
  it('이번 주 뽑기(연인원)와 뽑은 사람(순 인원)을 따로 센다', () => {
    const s = summarizeDraws(
      [
        row('a', '2026-11-22'),
        row('a', '2026-11-23'),
        row('a', '2026-11-24'),
        row('b', '2026-11-24', 's2'),
        row('c', '2026-11-15'), // 그 전 7일
        row('d', '2026-11-01'), // 28일 안, 주 밖
      ],
      today
    );
    expect(s.weekDraws).toBe(4);
    expect(s.weekDrawers).toBe(2);
    expect(s.prevWeekDraws).toBe(1);
    expect(s.monthDrawers).toBe(4);
  });

  it('하루별은 7칸, 마지막이 오늘이고 빈 날은 0', () => {
    const s = summarizeDraws(
      [row('a', '2026-11-24'), row('b', '2026-11-24')],
      today
    );
    expect(s.daily).toHaveLength(7);
    expect(s.daily[0]).toEqual({
      date: '2026-11-18',
      label: '11/18',
      count: 0,
    });
    expect(s.daily.at(-1)).toEqual({ date: today, label: '11/24', count: 2 });
  });

  it('많이 뽑힌 문장은 횟수 순, 같으면 id 순', () => {
    const s = summarizeDraws(
      [
        row('a', '2026-11-20', 'x'),
        row('b', '2026-11-20', 'y'),
        row('c', '2026-11-21', 'y'),
        row('d', '2026-11-21', 'a'),
      ],
      today
    );
    expect(s.top).toEqual([
      { sentenceId: 'y', count: 2 },
      { sentenceId: 'a', count: 1 },
      { sentenceId: 'x', count: 1 },
    ]);
  });
});

describe('shiftDate', () => {
  it('달·해를 넘긴다', () => {
    expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDate('2026-02-28', 1)).toBe('2026-03-01');
  });
});
