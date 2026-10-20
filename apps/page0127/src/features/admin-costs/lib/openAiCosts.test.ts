import { describe, expect, it } from 'vitest';

import {
  buildCostsUrl,
  dayCrossingInput,
  kstYesterday,
  parseCostBuckets,
} from './openAiCosts';

// 2026-10-01 00:00 UTC, 10-02 00:00 UTC (Unix 초)
const OCT1 = 1790812800;
const OCT2 = OCT1 + 86400;

const bucket = (start: number, ...values: number[]) => ({
  object: 'bucket',
  start_time: start,
  end_time: start + 86400,
  results: values.map((value) => ({
    object: 'organization.costs.result',
    amount: { value, currency: 'usd' },
  })),
});

describe('parseCostBuckets', () => {
  it('하루 버킷 안의 결과를 모두 더하고 센트로 바꾼다', () => {
    const { totalCents, daily } = parseCostBuckets([
      bucket(OCT1, 0.012, 0.003),
      bucket(OCT2, 0.04),
    ]);
    expect(totalCents).toBeCloseTo(5.5);
    expect(daily).toEqual([
      { date: '2026-10-01', cents: 1.5 },
      { date: '2026-10-02', cents: 4 },
    ]);
  });

  it('쓴 돈이 없는 날(빈 results)은 일별 목록에서 뺀다', () => {
    const { totalCents, daily } = parseCostBuckets([
      bucket(OCT1),
      bucket(OCT2, 0.01),
    ]);
    expect(totalCents).toBeCloseTo(1);
    expect(daily.map((d) => d.date)).toEqual(['2026-10-02']);
  });

  it('달러가 아닌 통화나 값이 없는 결과는 세지 않는다 — 원화 예산과 섞이면 안 된다', () => {
    const { totalCents } = parseCostBuckets([
      {
        start_time: OCT1,
        results: [
          { amount: { value: 1, currency: 'eur' } },
          { amount: {} },
          {},
          { amount: { value: 0.02, currency: 'usd' } },
        ],
      },
    ]);
    expect(totalCents).toBeCloseTo(2);
  });
});

describe('buildCostsUrl', () => {
  it('이번 달 1일(KST)부터, 하루 단위, 한 달 치(31개) 버킷', () => {
    // 2026-10-18 12:00 KST
    const url = buildCostsUrl(new Date('2026-10-18T03:00:00Z'));
    expect(url.origin + url.pathname).toBe(
      'https://api.openai.com/v1/organization/costs'
    );
    // 2026-10-01 00:00 KST = 2026-09-30 15:00 UTC
    expect(url.searchParams.get('start_time')).toBe(
      String(Date.UTC(2026, 8, 30, 15) / 1000)
    );
    expect(url.searchParams.get('bucket_width')).toBe('1d');
    expect(url.searchParams.get('limit')).toBe('31');
  });

  it('다음 쪽이 있으면 page 를 붙인다', () => {
    const url = buildCostsUrl(new Date('2026-10-18T03:00:00Z'), 'page_abc');
    expect(url.searchParams.get('page')).toBe('page_abc');
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
