import { afterEach, describe, expect, it } from 'vitest';

import {
  measureFieldHistory,
  mergeFieldHistory,
  mergeSeries,
  parseCruxHistoryRecord,
  parseCruxRecord,
} from './crux';

import type { FieldHistorySeries } from './types';

// 2026-07-09 shop.novera.town origin/PHONE 실측 응답을 그대로 축약한 픽스처.
const realRecord = {
  key: { formFactor: 'PHONE', origin: 'https://shop.novera.town' },
  collectionPeriod: {
    firstDate: { year: 2026, month: 6, day: 10 },
    lastDate: { year: 2026, month: 7, day: 7 },
  },
  metrics: {
    largest_contentful_paint: { percentiles: { p75: 1444 } },
    interaction_to_next_paint: { percentiles: { p75: 88 } },
    cumulative_layout_shift: { percentiles: { p75: '0.00' } }, // CLS만 문자열로 온다
    first_contentful_paint: { percentiles: { p75: 1310 } },
    experimental_time_to_first_byte: { percentiles: { p75: 872 } },
    largest_contentful_paint_image_time_to_first_byte: {
      percentiles: { p75: 928 },
    },
    largest_contentful_paint_image_resource_load_delay: {
      percentiles: { p75: 72 },
    },
    largest_contentful_paint_image_resource_load_duration: {
      percentiles: { p75: 129 },
    },
    largest_contentful_paint_image_element_render_delay: {
      percentiles: { p75: 216 },
    },
  },
};

describe('parseCruxRecord', () => {
  it('실측 응답에서 코어 지표를 뽑는다', () => {
    const cwv = parseCruxRecord(realRecord);
    expect(cwv.lcp).toBe(1444);
    expect(cwv.inp).toBe(88);
    expect(cwv.fcp).toBe(1310);
    expect(cwv.ttfb).toBe(872);
  });

  it('CLS는 문자열("0.00")로 오므로 숫자로 변환한다', () => {
    const cwv = parseCruxRecord(realRecord);
    expect(cwv.cls).toBe(0);
    expect(typeof cwv.cls).toBe('number');
  });

  it('CLS 문자열 "0.01"도 숫자 0.01이 된다', () => {
    const r = structuredClone(realRecord);
    r.metrics.cumulative_layout_shift.percentiles.p75 = '0.01';
    expect(parseCruxRecord(r).cls).toBe(0.01);
  });

  it('LCP 하위분해 4단계를 뽑는다 — 합이 대략 LCP다', () => {
    const b = parseCruxRecord(realRecord).lcpBreakdown;
    expect(b).toEqual({
      ttfbMs: 928,
      loadDelayMs: 72,
      loadDurationMs: 129,
      renderDelayMs: 216,
    });
    const sum = b!.ttfbMs + b!.loadDelayMs + b!.loadDurationMs + b!.renderDelayMs;
    expect(Math.abs(sum - 1444)).toBeLessThan(150); // 1345 vs 1444
  });

  it('하위분해 지표가 하나라도 없으면 lcpBreakdown을 만들지 않는다(부분 합계 금지)', () => {
    const r = structuredClone(realRecord);
    delete (r.metrics as Record<string, unknown>)[
      'largest_contentful_paint_image_resource_load_duration'
    ];
    expect(parseCruxRecord(r).lcpBreakdown).toBeUndefined();
  });

  it('없는 지표는 undefined로 남긴다 — 0으로 채우지 않는다', () => {
    const r = structuredClone(realRecord);
    delete (r.metrics as Record<string, unknown>)['interaction_to_next_paint'];
    const cwv = parseCruxRecord(r);
    expect(cwv.inp).toBeUndefined();
    expect(cwv.inp).not.toBe(0); // "데이터 없음"과 "0ms"는 다르다
  });

  it('metrics가 비어도 throw하지 않는다', () => {
    const cwv = parseCruxRecord({ ...realRecord, metrics: {} });
    expect(cwv.lcp).toBeUndefined();
    expect(cwv.lcpBreakdown).toBeUndefined();
  });
});

// ── History API ─────────────────────────────────────────────────────────
// 2026-07-09 shop.novera.town origin 합산 실측 응답의 모양을 3주로 축약한 픽스처.
// 실제 응답의 함정을 그대로 재현한다:
//   - week0: 트래픽 임계 미만 → p75 null, densities "NaN"
//   - week1: LCP는 있고 INP만 결측 (INP는 25주 중 2주만 값이 있었다)
//   - week2: 전부 존재
const historyRecord = {
  key: { origin: 'https://shop.novera.town' },
  collectionPeriods: [
    {
      firstDate: { year: 2025, month: 12, day: 21 },
      lastDate: { year: 2026, month: 1, day: 17 },
    },
    {
      firstDate: { year: 2026, month: 5, day: 31 },
      lastDate: { year: 2026, month: 6, day: 27 },
    },
    {
      firstDate: { year: 2026, month: 6, day: 7 },
      lastDate: { year: 2026, month: 7, day: 4 },
    },
  ],
  metrics: {
    largest_contentful_paint: {
      percentilesTimeseries: { p75s: [null, 1250, 1221] },
      histogramTimeseries: [
        { start: 0, end: 2500, densities: ['NaN', 0.9392, 0.9416] },
        { start: 2500, end: 4000, densities: ['NaN', 0.0354, 0.0367] },
        { start: 4000, densities: ['NaN', 0.0254, 0.0217] },
      ],
    },
    interaction_to_next_paint: {
      percentilesTimeseries: { p75s: [null, null, 63] },
      histogramTimeseries: [
        { start: 0, end: 200, densities: ['NaN', 'NaN', 0.9564] },
        { start: 200, end: 500, densities: ['NaN', 'NaN', 0.0308] },
        { start: 500, densities: ['NaN', 'NaN', 0.0128] },
      ],
    },
    cumulative_layout_shift: {
      // CLS p75만 문자열로 온다.
      percentilesTimeseries: { p75s: [null, '0.00', '0.00'] },
      histogramTimeseries: [
        { start: '0.00', end: '0.10', densities: ['NaN', 0.9264, 0.9279] },
        { start: '0.10', end: '0.25', densities: ['NaN', 0.041, 0.0402] },
        { start: '0.25', densities: ['NaN', 0.0326, 0.0319] },
      ],
    },
  },
};

describe('parseCruxHistoryRecord', () => {
  it('데이터가 하나도 없는 주는 버린다 — 빈 앞구간이 차트를 눌러 찌그러뜨린다', () => {
    const points = parseCruxHistoryRecord(historyRecord);
    expect(points).toHaveLength(2);
    expect(points.map((p) => p.periodEnd)).toEqual(['2026-06-27', '2026-07-04']);
  });

  it('p75와 등급 분포를 함께 뽑는다', () => {
    const [, last] = parseCruxHistoryRecord(historyRecord);
    expect(last.lcp).toEqual({
      p75: 1221,
      good: 0.9416,
      needsImprovement: 0.0367,
      poor: 0.0217,
    });
  });

  it('densities의 문자열 "NaN"은 undefined다 — 0으로 새지 않는다', () => {
    const [first] = parseCruxHistoryRecord(historyRecord);
    // week1은 LCP는 있으나 INP는 전부 결측
    expect(first.lcp?.good).toBe(0.9392);
    expect(first.inp).toBeUndefined();
  });

  it('중간에 뚫린 구멍은 살린다 — 그 지표만 undefined, 주 자체는 유지', () => {
    const points = parseCruxHistoryRecord(historyRecord);
    expect(points[0].inp).toBeUndefined(); // 구멍
    expect(points[1].inp?.p75).toBe(63); // 값
    expect(points[0].lcp?.p75).toBe(1250); // 같은 주의 다른 지표는 살아있다
  });

  it('CLS p75 문자열 "0.00"을 숫자 0으로 변환한다', () => {
    const [, last] = parseCruxHistoryRecord(historyRecord);
    expect(last.cls?.p75).toBe(0);
    expect(typeof last.cls?.p75).toBe('number');
  });

  it('null p75를 0으로 만들지 않는다 (Number(null) === 0 함정)', () => {
    const [first] = parseCruxHistoryRecord(historyRecord);
    expect(first.inp?.p75).not.toBe(0);
    expect(first.inp).toBeUndefined();
  });

  it('collectionPeriods가 비어도 throw하지 않는다', () => {
    expect(
      parseCruxHistoryRecord({ ...historyRecord, collectionPeriods: [] })
    ).toEqual([]);
  });

  it('good/ni/poor 합은 대략 1이다 (bin 순서를 뒤바꾸지 않았다는 확인)', () => {
    const [, last] = parseCruxHistoryRecord(historyRecord);
    const { good = 0, needsImprovement = 0, poor = 0 } = last.lcp ?? {};
    expect(Math.abs(good + needsImprovement + poor - 1)).toBeLessThan(0.001);
    expect(good).toBeGreaterThan(poor); // bin0이 good이다
  });
});

const series = (
  target: string,
  points: FieldHistorySeries['points']
): FieldHistorySeries => ({ scope: 'origin', target, points });

const pt = (periodEnd: string, p75: number) => ({
  periodStart: '2026-01-01',
  periodEnd,
  lcp: { p75 },
});

describe('mergeSeries', () => {
  it('25주 롤링 윈도 밖으로 밀려난 과거를 보존한다', () => {
    const prev = series('o', [pt('2026-01-17', 2094), pt('2026-06-27', 1250)]);
    const next = series('o', [pt('2026-06-27', 1250), pt('2026-07-04', 1221)]);
    const merged = mergeSeries(prev, next);
    expect(merged.points.map((p) => p.periodEnd)).toEqual([
      '2026-01-17',
      '2026-06-27',
      '2026-07-04',
    ]);
  });

  it('같은 주는 새 값이 이긴다 (CrUX의 사후 보정 반영)', () => {
    const prev = series('o', [pt('2026-07-04', 9999)]);
    const next = series('o', [pt('2026-07-04', 1221)]);
    expect(mergeSeries(prev, next).points[0].lcp?.p75).toBe(1221);
  });

  it('target이 바뀌면(origin→url 승격) 과거를 잇지 않는다 — 다른 것을 잰 값이다', () => {
    const prev = series('https://shop.novera.town', [pt('2026-01-17', 2094)]);
    const next: FieldHistorySeries = {
      scope: 'url',
      target: 'https://shop.novera.town/',
      points: [pt('2026-07-04', 1221)],
    };
    const merged = mergeSeries(prev, next);
    expect(merged.points).toHaveLength(1);
    expect(merged.scope).toBe('url');
  });

  it('정렬은 periodEnd 오름차순이다', () => {
    const prev = series('o', [pt('2026-07-04', 1)]);
    const next = series('o', [pt('2026-06-27', 2), pt('2026-01-17', 3)]);
    expect(mergeSeries(prev, next).points.map((p) => p.periodEnd)).toEqual([
      '2026-01-17',
      '2026-06-27',
      '2026-07-04',
    ]);
  });
});

describe('measureFieldHistory — scope 일치', () => {
  const originalKey = process.env.CRUX_API_KEY;
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    process.env.CRUX_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
  });

  /** url 쿼리는 formFactor가 있을 때만 404 → 합산만 url 데이터가 있는 실제 상황 재현. */
  const mockFetch = (calls: { target: string; ff?: string }[]) => {
    globalThis.fetch = (async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as {
        url?: string;
        origin?: string;
        formFactor?: string;
      };
      calls.push({
        target: body.url ? 'url' : 'origin',
        ff: body.formFactor,
      });
      // 실측(2026-07-09): url+PHONE, url+DESKTOP은 404. url 합산과 origin 전부는 200.
      if (body.url && body.formFactor) {
        return { status: 404, ok: false } as Response;
      }
      return {
        status: 200,
        ok: true,
        json: async () => ({ record: historyRecord }),
      } as Response;
    }) as typeof fetch;
  };

  it('폼팩터 하나라도 url 데이터가 없으면 셋 다 origin으로 내린다', async () => {
    process.env.CRUX_API_KEY = 'test-key';
    const calls: { target: string; ff?: string }[] = [];
    mockFetch(calls);

    const h = await measureFieldHistory(
      'https://shop.novera.town/',
      () => '2026-07-09T00:00:00Z'
    );

    // 폼팩터 토글이 서로 다른 대상을 비교하면 안 된다 — scope가 모두 같아야 한다.
    expect(h?.all?.scope).toBe('origin');
    expect(h?.mobile?.scope).toBe('origin');
    expect(h?.desktop?.scope).toBe('origin');
    expect(h?.all?.target).toBe('https://shop.novera.town');
    // url 3회 시도 후 origin 3회 재시도
    expect(calls.filter((c) => c.target === 'url')).toHaveLength(3);
    expect(calls.filter((c) => c.target === 'origin')).toHaveLength(3);
  });

  it('세 폼팩터 모두 url 데이터가 있으면 url을 쓴다(트래픽 성장 시 자동 승격)', async () => {
    process.env.CRUX_API_KEY = 'test-key';
    globalThis.fetch = (async () =>
      ({
        status: 200,
        ok: true,
        json: async () => ({ record: historyRecord }),
      }) as Response) as typeof fetch;

    const h = await measureFieldHistory(
      'https://shop.novera.town/',
      () => '2026-07-09T00:00:00Z'
    );
    expect(h?.all?.scope).toBe('url');
    expect(h?.mobile?.scope).toBe('url');
    expect(h?.desktop?.scope).toBe('url');
  });

  it('API 키가 없으면 undefined (측정 실패가 아니라 미수집)', async () => {
    delete process.env.CRUX_API_KEY;
    expect(await measureFieldHistory('https://shop.novera.town/')).toBeUndefined();
  });
});

describe('mergeFieldHistory', () => {
  it('이번 응답에 없는 폼팩터는 기존 값을 보존한다 — 일시적 404가 과거를 지우면 안 된다', () => {
    const prev = {
      updatedAt: '2026-07-01T00:00:00Z',
      all: series('o', [pt('2026-06-27', 1250)]),
      desktop: series('o', [pt('2026-06-27', 1157)]),
    };
    const next = {
      updatedAt: '2026-07-09T00:00:00Z',
      all: series('o', [pt('2026-07-04', 1221)]),
      // desktop이 이번엔 404였다
    };
    const merged = mergeFieldHistory(prev, next);
    expect(merged.all?.points).toHaveLength(2);
    expect(merged.desktop?.points).toHaveLength(1); // 보존
    expect(merged.updatedAt).toBe('2026-07-09T00:00:00Z');
  });

  it('기존 파일이 없으면 새 응답을 그대로 쓴다', () => {
    const next = {
      updatedAt: '2026-07-09T00:00:00Z',
      all: series('o', [pt('2026-07-04', 1221)]),
    };
    expect(mergeFieldHistory(undefined, next)).toEqual(next);
  });
});
