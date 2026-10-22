import { describe, expect, it } from 'vitest';

import {
  addDays,
  changeRate,
  daysBetween,
  listDateKeys,
  MAX_RANGE_DAYS,
  parseDateRange,
  previousRange,
  toRangeQuery,
  toUtcBounds,
} from './dateRange';

// KST 10/22 정오 → 어제 = 10/21
const now = new Date('2026-10-22T03:00:00Z');

describe('parseDateRange', () => {
  it('값이 없으면 기본(최근 30일, 어제까지)', () => {
    expect(parseDateRange({}, now)).toEqual({
      preset: '30d',
      from: '2026-09-22',
      to: '2026-10-21',
      days: 30,
      label: '최근 30일',
    });
  });

  it('최근 7일은 어제를 포함한 7일', () => {
    const r = parseDateRange({ range: '7d' }, now);
    expect([r.from, r.to, r.days]).toEqual(['2026-10-15', '2026-10-21', 7]);
  });

  it('UTC 로는 전날이어도 KST 기준 어제를 끝으로 잡는다', () => {
    // 2026-10-22 08:00 KST = 2026-10-21 23:00 UTC
    const r = parseDateRange({ range: '7d' }, new Date('2026-10-21T23:00:00Z'));
    expect(r.to).toBe('2026-10-21');
  });

  it('사용자 지정 기간', () => {
    const r = parseDateRange(
      { range: 'custom', from: '2026-10-01', to: '2026-10-15' },
      now
    );
    expect(r).toMatchObject({
      preset: 'custom',
      from: '2026-10-01',
      to: '2026-10-15',
      days: 15,
      label: '10/01 ~ 10/15',
    });
  });

  it('시작·끝이 뒤바뀌면 바로잡는다', () => {
    const r = parseDateRange(
      { range: 'custom', from: '2026-10-15', to: '2026-10-01' },
      now
    );
    expect([r.from, r.to]).toEqual(['2026-10-01', '2026-10-15']);
  });

  it('오늘·미래는 어제로 자른다', () => {
    const r = parseDateRange(
      { range: 'custom', from: '2026-10-20', to: '2026-12-01' },
      now
    );
    expect([r.from, r.to]).toEqual(['2026-10-20', '2026-10-21']);
    const future = parseDateRange(
      { range: 'custom', from: '2026-11-01', to: '2026-12-01' },
      now
    );
    expect([future.from, future.to]).toEqual(['2026-10-21', '2026-10-21']);
  });

  it('1년을 넘으면 끝을 기준으로 자른다', () => {
    const r = parseDateRange(
      { range: 'custom', from: '2020-01-01', to: '2026-10-21' },
      now
    );
    expect(r.days).toBe(MAX_RANGE_DAYS);
    expect(r.to).toBe('2026-10-21');
  });

  it('잘못된 날짜는 기본 기간으로 물러난다', () => {
    expect(
      parseDateRange({ range: 'custom', from: '2026-02-30', to: 'x' }, now)
        .preset
    ).toBe('30d');
    expect(parseDateRange({ range: 'bogus' }, now, '7d').preset).toBe('7d');
  });
});

describe('날짜 계산', () => {
  it('월·연 경계를 넘는다', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-10-01', '2026-10-01')).toBe(1);
  });

  it('기간의 모든 날짜를 깐다', () => {
    const r = parseDateRange({ range: '7d' }, now);
    expect(listDateKeys(r)).toEqual([
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
    ]);
  });

  it('쿼리스트링으로 되돌린다', () => {
    expect(toRangeQuery(parseDateRange({ range: '7d' }, now))).toBe('range=7d');
    expect(
      toRangeQuery(
        parseDateRange(
          { range: 'custom', from: '2026-10-01', to: '2026-10-15' },
          now
        )
      )
    ).toBe('range=custom&from=2026-10-01&to=2026-10-15');
  });
});

describe('previousRange', () => {
  it('바로 앞의 같은 길이 기간', () => {
    const p = previousRange(parseDateRange({ range: '7d' }, now));
    expect([p.from, p.to, p.days]).toEqual(['2026-10-08', '2026-10-14', 7]);
  });
  it('증감률 — 앞 기간이 0 이면 null', () => {
    expect(changeRate(15, 10)).toBeCloseTo(0.5);
    expect(changeRate(3, 0)).toBeNull();
  });
});

describe('toUtcBounds', () => {
  it('KST 자정 기준 [시작, 다음 날 시작)', () => {
    const r = parseDateRange(
      { range: 'custom', from: '2026-10-01', to: '2026-10-02' },
      now
    );
    expect(toUtcBounds(r)).toEqual({
      gte: '2026-09-30T15:00:00.000Z',
      lt: '2026-10-02T15:00:00.000Z',
    });
  });
});
