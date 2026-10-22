import { describe, expect, it } from 'vitest';

import { parseDateRange } from '@/shared/lib/admin/dateRange';

import { computeRetention, weekStartOf } from './retention';

// KST 10/22 정오 → 어제 = 10/21
const now = new Date('2026-10-22T03:00:00Z');
const yesterday = '2026-10-21';
const range = (from: string, to: string) =>
  parseDateRange({ range: 'custom', from, to }, now);

const v = (user_id: string, ...dates: string[]) =>
  dates.map((visit_date) => ({ user_id, visit_date }));

describe('weekStartOf', () => {
  it('월요일을 주의 시작으로 본다', () => {
    expect(weekStartOf('2026-10-19')).toBe('2026-10-19'); // 월
    expect(weekStartOf('2026-10-25')).toBe('2026-10-19'); // 일
    expect(weekStartOf('2026-10-01')).toBe('2026-09-28'); // 목
  });
});

describe('computeRetention — 기간 재방문', () => {
  it('서로 다른 2일 이상 온 사람만 재방문으로 센다', () => {
    const r = computeRetention(
      [
        ...v('a', '2026-10-15', '2026-10-16'),
        ...v('b', '2026-10-15'),
        // 기간 밖 방문은 세지 않는다
        ...v('c', '2026-10-01', '2026-10-20'),
      ],
      [],
      range('2026-10-15', '2026-10-21'),
      yesterday
    );
    expect(r.activeUsers).toBe(3);
    expect(r.returningUsers).toBe(1);
    expect(r.returningRate).toBeCloseTo(1 / 3);
    expect(r.avgVisitDays).toBeCloseTo(4 / 3);
  });

  it('방문이 없으면 비율은 0 이 아니라 null', () => {
    const r = computeRetention(
      [],
      [],
      range('2026-10-15', '2026-10-21'),
      yesterday
    );
    expect(r.returningRate).toBeNull();
    expect(r.avgVisitDays).toBeNull();
  });
});

describe('computeRetention — 가입 코호트', () => {
  it('가입 당일은 재방문이 아니다', () => {
    const r = computeRetention(
      v('a', '2026-09-01'),
      [{ id: 'a', signupDate: '2026-09-01' }],
      range('2026-09-01', '2026-09-30'),
      yesterday
    );
    expect(r.total.d1).toEqual({ eligible: 1, retained: 0, rate: 0 });
    expect(r.total.w1.retained).toBe(0);
  });

  it('D1·W1·W4 창에 맞춰 판정한다', () => {
    const r = computeRetention(
      [
        // a: 다음 날 + 25일째
        ...v('a', '2026-09-01', '2026-09-02', '2026-09-26'),
        // b: 5일째만
        ...v('b', '2026-09-06'),
        // c: 안 옴
      ],
      [
        { id: 'a', signupDate: '2026-09-01' },
        { id: 'b', signupDate: '2026-09-01' },
        { id: 'c', signupDate: '2026-09-01' },
      ],
      range('2026-09-01', '2026-09-30'),
      yesterday
    );
    expect(r.total.signups).toBe(3);
    expect(r.total.d1.retained).toBe(1);
    expect(r.total.w1.retained).toBe(2);
    expect(r.total.w4.retained).toBe(1);
    expect(r.total.w4.rate).toBeCloseTo(1 / 3);
  });

  it('창이 아직 안 끝난 사람은 분모에서 뺀다', () => {
    // 10/10 가입 → W1 창 끝 10/17(판정), W4 창 끝 11/07(보류)
    const r = computeRetention(
      [],
      [{ id: 'a', signupDate: '2026-10-10' }],
      range('2026-10-01', '2026-10-21'),
      yesterday
    );
    expect(r.total.w1.eligible).toBe(1);
    expect(r.total.w4).toEqual({ eligible: 0, retained: 0, rate: null });
  });

  it('가입 주별로 묶고 오래된 주가 먼저', () => {
    const r = computeRetention(
      [],
      [
        { id: 'a', signupDate: '2026-10-08' },
        { id: 'b', signupDate: '2026-09-30' },
        { id: 'c', signupDate: '2026-10-05' },
      ],
      range('2026-09-28', '2026-10-21'),
      yesterday
    );
    expect(r.cohorts.map((c) => [c.weekStart, c.signups])).toEqual([
      ['2026-09-28', 1],
      ['2026-10-05', 2],
    ]);
    expect(r.cohorts[0].label).toBe('09/28 주');
  });

  it('방문 기록 적재 전 가입자는 코호트에서 뺀다', () => {
    const r = computeRetention(
      [],
      [{ id: 'a', signupDate: '2026-07-20' }],
      range('2026-07-01', '2026-07-31'),
      yesterday
    );
    expect(r.total.signups).toBe(0);
    expect(r.beforeLogStart).toBe(true);
  });
});
