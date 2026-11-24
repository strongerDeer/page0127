import { describe, expect, it } from 'vitest';

import { summarizeActivity, summarizeBeta, type Visit } from './activity';

const period = {
  today: '2026-10-27',
  yesterday: '2026-10-26',
  weekStart: '2026-10-20',
  monthStart: '2026-09-27',
  recentStart: '2026-10-25',
};

const v = (user_id: string, ...dates: string[]): Visit[] =>
  dates.map((visit_date) => ({ user_id, visit_date }));

describe('summarizeActivity', () => {
  it('같은 사람은 한 번만 센다 (연인원이 아니다)', () => {
    const visits = [
      ...v('a', '2026-10-24', '2026-10-25', '2026-10-26'),
      ...v('b', '2026-10-26'),
      ...v('c', '2026-10-01'),
      ...v('d', '2026-10-27'),
    ];
    const s = summarizeActivity(visits, period);
    expect(s.dau).toBe(2);
    expect(s.wau).toBe(2);
    expect(s.mau).toBe(3);
    // 오늘은 진행 중이라 DAU·MAU 에 넣지 않는다
    expect(s.today).toBe(1);
    // 30일 DAU 합 5 / 30 / MAU 3
    expect(s.stickiness).toBeCloseTo(5 / 30 / 3);
  });

  it('14일 DAU 추세와 그제 DAU·그 전 주 WAU 를 낸다', () => {
    const visits = [
      ...v('a', '2026-10-25', '2026-10-26', '2026-10-15'),
      ...v('b', '2026-10-25', '2026-10-13'),
      ...v('c', '2026-10-12'),
    ];
    const s = summarizeActivity(visits, period);
    expect(s.dauSeries).toHaveLength(14);
    // 마지막 칸 = 어제(10/26), 첫 칸 = 10/13
    expect(s.dauSeries.at(-1)).toBe(1);
    expect(s.dauSeries.at(-2)).toBe(2);
    expect(s.dauSeries[0]).toBe(1);
    expect(s.prevDau).toBe(2);
    // 그 전 7일 = 10/13~10/19 → a, b
    expect(s.prevWau).toBe(2);
  });

  it('방문이 없으면 고착도는 null', () => {
    expect(summarizeActivity([], period).stickiness).toBeNull();
  });
});

describe('summarizeBeta', () => {
  it('책 넣은 회원·최근 3일 안 온 회원·알림 켠 회원을 센다', () => {
    const members = [
      { id: 'a', createdAt: '2026-10-01' },
      { id: 'b', createdAt: '2026-10-01' },
      // 어제 가입 — 아직 멈췄다고 보지 않는다
      { id: 'new', createdAt: '2026-10-26' },
    ];
    const s = summarizeBeta(
      members,
      ['a', 'a', 'x'],
      v('a', '2026-10-27'),
      period,
      // 같은 회원의 기기 두 대는 한 명, 운영자 구독은 회원 목록에 없어 빠진다
      ['b', 'b', 'admin']
    );
    expect(s).toEqual({ members: 3, withBooks: 1, idle: 1, withPush: 1 });
  });
});
