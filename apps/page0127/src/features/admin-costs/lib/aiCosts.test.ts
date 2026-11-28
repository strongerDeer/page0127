import { describe, expect, it } from 'vitest';

import {
  costsRange,
  dayCrossingInput,
  kstYesterday,
  parseCostItems,
} from './aiCosts';

/** 시간 버킷 하나 — amount 는 센트 단위 소수 문자열 */
const hour = (startingAt: string, amount: string, currency = 'USD') => ({
  starting_at: startingAt,
  cost: { amount, currency },
});

describe('parseCostItems', () => {
  it('시간 버킷을 KST 날짜로 묶는다 — 15:00 UTC 부터는 다음 날', () => {
    const { totalCents, daily } = parseCostItems([
      hour('2026-11-01T14:00:00Z', '1.2'), // KST 11/1 23시
      hour('2026-11-01T15:00:00Z', '0.3'), // KST 11/2 00시
      hour('2026-11-02T03:00:00Z', '4'), // KST 11/2 12시
    ]);
    expect(daily).toEqual([
      { date: '2026-11-01', cents: 1.2 },
      { date: '2026-11-02', cents: 4.3 },
    ]);
    expect(totalCents).toBeCloseTo(5.5);
  });

  it('쓴 돈이 없는 날은 일별 목록에서 뺀다', () => {
    const { daily } = parseCostItems([
      hour('2026-11-01T03:00:00Z', '0'),
      hour('2026-11-02T03:00:00Z', '1'),
    ]);
    expect(daily.map((d) => d.date)).toEqual(['2026-11-02']);
  });

  it('달러가 아닌 통화나 숫자가 아닌 값은 세지 않는다 — 원화 예산과 섞이면 안 된다', () => {
    const { totalCents } = parseCostItems([
      hour('2026-11-01T03:00:00Z', '100', 'EUR'),
      hour('2026-11-01T04:00:00Z', 'abc'),
      hour('2026-11-01T05:00:00Z', '2', 'usd'),
    ]);
    expect(totalCents).toBeCloseTo(2);
  });
});

describe('costsRange', () => {
  it('이번 달 1일(KST)부터 지금 직전 정시까지', () => {
    // 2026-11-18 12:34 KST
    expect(costsRange(new Date('2026-11-18T03:34:00Z'))).toEqual({
      // 2026-11-01 00:00 KST = 2026-10-31 15:00 UTC
      starting_at: '2026-10-31T15:00:00.000Z',
      ending_at: '2026-11-18T03:00:00.000Z',
    });
  });

  it('지난달을 읽으면 그 달 끝에서 멈춘다 — 매달 1일 크론', () => {
    // 어제 = 2026-10-31 KST, 지금 = 2026-11-01 10:47 KST
    expect(
      costsRange(
        new Date('2026-10-31T01:47:00Z'),
        new Date('2026-11-01T01:47:00Z')
      )
    ).toEqual({
      starting_at: '2026-09-30T15:00:00.000Z',
      ending_at: '2026-10-31T15:00:00.000Z',
    });
  });

  it('달이 바뀐 첫 1시간은 범위가 비어 부르지 않는다', () => {
    // 2026-11-01 00:20 KST
    expect(costsRange(new Date('2026-10-31T15:20:00Z'))).toBeNull();
  });
});

describe('kstYesterday', () => {
  it('KST 기준 어제 날짜를 준다 — 매달 1일엔 지난달 말일', () => {
    // 2026-11-01 09:30 KST
    expect(kstYesterday(new Date('2026-11-01T00:30:00Z')).date).toBe(
      '2026-10-31'
    );
  });
});

describe('dayCrossingInput', () => {
  const costs = {
    totalCents: 900,
    daily: [
      { date: '2026-10-01', cents: 300 },
      { date: '2026-10-02', cents: 500 },
      { date: '2026-10-03', cents: 100 },
    ],
  };

  it('그날까지의 누적과, 그날을 빼기 직전의 누적을 준다', () => {
    expect(dayCrossingInput(costs, '2026-10-02')).toEqual({
      beforeCents: 300,
      afterCents: 800,
    });
  });

  it('그날 청구가 없으면 직전·직후가 같다 — 기준선을 건너지 않는다', () => {
    expect(dayCrossingInput(costs, '2026-10-05')).toEqual({
      beforeCents: 900,
      afterCents: 900,
    });
  });
});
