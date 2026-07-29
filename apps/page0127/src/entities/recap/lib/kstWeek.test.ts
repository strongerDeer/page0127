import { describe, expect, it } from 'vitest';

import { isWithinWeek, toKstWeekRange } from './kstWeek';

describe('toKstWeekRange', () => {
  it('주는 월요일에 시작해서 일요일에 끝난다', () => {
    // 2026-07-28 은 화요일. 그 주는 07-27(월) ~ 08-02(일)
    const week = toKstWeekRange(new Date('2026-07-28T03:00:00Z'));

    expect(week).toEqual({ startKey: '2026-07-27', endKey: '2026-08-02' });
  });

  it('월요일에는 그날이 곧 주의 시작이다', () => {
    const week = toKstWeekRange(new Date('2026-07-27T03:00:00Z'));

    expect(week.startKey).toBe('2026-07-27');
  });

  it('일요일에는 그날이 곧 주의 끝이다', () => {
    const week = toKstWeekRange(new Date('2026-08-02T03:00:00Z'));

    expect(week.endKey).toBe('2026-08-02');
  });

  // 이 두 케이스가 이 파일이 존재하는 이유다.
  // KST 는 UTC 보다 9시간 빠르므로 둘이 날짜를 다르게 보는 구간은 UTC 15:00~24:00 뿐이다.
  it('UTC 일요일 16시는 KST 로 월요일 새벽이라 이미 새 주다', () => {
    // UTC 2026-08-02 16:00(일) === KST 2026-08-03 01:00(월)
    const week = toKstWeekRange(new Date('2026-08-02T16:00:00Z'));

    expect(week).toEqual({ startKey: '2026-08-03', endKey: '2026-08-09' });
  });

  it('UTC 일요일 14시는 KST 로도 일요일이라 아직 지난 주다', () => {
    // UTC 2026-08-02 14:00(일) === KST 2026-08-02 23:00(일)
    const week = toKstWeekRange(new Date('2026-08-02T14:00:00Z'));

    expect(week).toEqual({ startKey: '2026-07-27', endKey: '2026-08-02' });
  });
});

describe('isWithinWeek', () => {
  const week = { startKey: '2026-07-27', endKey: '2026-08-02' };

  it('양끝을 포함한다', () => {
    expect(isWithinWeek('2026-07-27', week)).toBe(true);
    expect(isWithinWeek('2026-08-02', week)).toBe(true);
  });

  it('구간 밖은 제외한다', () => {
    expect(isWithinWeek('2026-07-26', week)).toBe(false);
    expect(isWithinWeek('2026-08-03', week)).toBe(false);
  });
});
