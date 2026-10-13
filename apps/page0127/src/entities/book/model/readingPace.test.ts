import { describe, expect, it } from 'vitest';

import { getReadingPace } from './readingPace';

// 2026-10-13 = 286번째 날 / 365, 남은 79일
const OCT13 = { year: 2026, today: '2026-10-13' };

describe('getReadingPace', () => {
  it('조금 뒤처짐 — 지금 속도 예상과 주당 필요 권수', () => {
    const pace = getReadingPace({ completed: 14, target: 40, ...OCT13 });
    expect(pace.state).toBe('behind');
    expect(pace.projected).toBe(18);
    expect(pace.weeksLeft).toBe(11.3);
    expect(pace.perWeek).toBe(2.3);
    expect(pace.expected).toBe(31.3);
    expect(pace.gap).toBe(-17);
  });

  it('주당 3권 넘게 필요하면 많이 뒤처짐', () => {
    expect(getReadingPace({ completed: 5, target: 40, ...OCT13 }).state).toBe(
      'far_behind'
    );
  });

  it('1권 이상 앞서면 앞섬', () => {
    const pace = getReadingPace({ completed: 35, target: 40, ...OCT13 });
    expect(pace.state).toBe('ahead');
    expect(pace.gap).toBe(4);
    expect(pace.projected).toBe(45);
  });

  it('예상 위치와 1권 미만 차이면 딱 맞음', () => {
    expect(getReadingPace({ completed: 31, target: 40, ...OCT13 }).state).toBe(
      'on_track'
    );
  });

  it('목표 이상이면 달성 + 초과 권수', () => {
    const pace = getReadingPace({ completed: 42, target: 40, ...OCT13 });
    expect(pace.state).toBe('met');
    expect(pace.surplus).toBe(2);
    expect(pace.perWeek).toBe(0);
  });

  it('연초(경과율 4% 미만)에는 예상 권수를 만들지 않는다', () => {
    const pace = getReadingPace({
      completed: 1,
      target: 40,
      year: 2026,
      today: '2026-01-07',
    });
    expect(pace.state).toBe('early');
    expect(pace.projected).toBeNull();
    expect(pace.perWeek).toBe(0.8);
  });

  it('12월 31일에도 0으로 나누지 않는다 (남은 일수 최소 1일)', () => {
    // 2권 남았는데 하루 남음 → 주당 14권 → '빠듯해요'가 맞는 말
    const pace = getReadingPace({
      completed: 38,
      target: 40,
      year: 2026,
      today: '2026-12-31',
    });
    expect(pace.weeksLeft).toBe(0.1);
    expect(pace.perWeek).toBe(14);
    expect(pace.state).toBe('far_behind');
  });

  it('윤년 12월 31일은 366번째 날', () => {
    const pace = getReadingPace({
      completed: 10,
      target: 0,
      year: 2028,
      today: '2028-12-31',
    });
    expect(pace.elapsed).toBe(1);
    expect(pace.perMonth).toBe(0.8);
  });

  it('목표가 없으면 월 평균만', () => {
    const pace = getReadingPace({ completed: 14, target: 0, ...OCT13 });
    expect(pace.state).toBe('no_goal');
    expect(pace.perMonth).toBe(1.5);
    expect(pace.projected).toBeNull();
  });

  it('지난해는 결과로 확정한다', () => {
    const base = { year: 2025, today: '2026-10-13' };
    expect(getReadingPace({ completed: 36, target: 40, ...base }).state).toBe(
      'past_missed'
    );
    expect(getReadingPace({ completed: 41, target: 40, ...base }).state).toBe(
      'past_met'
    );
    expect(getReadingPace({ completed: 12, target: 0, ...base }).perMonth).toBe(
      1
    );
  });
});
