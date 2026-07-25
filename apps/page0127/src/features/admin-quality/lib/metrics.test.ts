import { describe, expect, it } from 'vitest';

import {
  buildSeries,
  buildTrendPayload,
  METRICS,
  seriesDelta,
  weekLabel,
} from './metrics';

import type { PageMetrics, QualityRecord } from '@repo/quality/types';

// ── 테스트용 최소 레코드 빌더 ────────────────────────────────────────────────
type PageInput = {
  name: string;
  perf?: number;
  lcp?: number;
  cls?: number;
  weightKb?: number;
};

const mkPage = (p: PageInput): PageMetrics =>
  ({
    name: p.name,
    url: `/${p.name}`,
    lighthouse: {
      performance: p.perf ?? 0,
      accessibility: 100,
      bestPractices: 100,
      seo: 100,
    },
    cwv: { lcp: p.lcp ?? 0, cls: p.cls ?? 0, tbt: 0, fcp: 0, si: 0 },
    weight:
      p.weightKb == null
        ? undefined
        : { totalKb: p.weightKb, imageKb: 0, scriptKb: 0 },
  }) as PageMetrics;

const rec = (
  timestamp: string,
  pages: PageInput[],
  desktopPages?: PageInput[],
): QualityRecord =>
  ({
    timestamp,
    pages: pages.map(mkPage),
    desktopPages: desktopPages?.map(mkPage),
  }) as unknown as QualityRecord;

describe('buildSeries', () => {
  const records = [
    rec('2026-07-07T00:00:00Z', [
      { name: 'home', perf: 50 },
      { name: 'about', perf: 80 },
    ]),
    rec('2026-07-14T00:00:00Z', [
      { name: 'home', perf: 55 },
      { name: 'about', perf: 85 },
    ]),
  ];

  it('페이지별로 records 순서에 맞춰 값 배열을 만든다', () => {
    const s = buildSeries(records, 'mobile', METRICS.perf);
    expect(s).toEqual([
      { page: 'home', values: [50, 55] },
      { page: 'about', values: [80, 85] },
    ]);
  });

  it('어떤 레코드에 페이지가 없으면 그 자리는 null(선이 끊김)', () => {
    const withGap = [
      rec('2026-07-07T00:00:00Z', [{ name: 'home', perf: 50 }]),
      rec('2026-07-14T00:00:00Z', [
        { name: 'home', perf: 55 },
        { name: 'about', perf: 85 },
      ]),
    ];
    const s = buildSeries(withGap, 'mobile', METRICS.perf);
    // 페이지 순서는 최신 레코드 기준 → home, about
    expect(s).toEqual([
      { page: 'home', values: [50, 55] },
      { page: 'about', values: [null, 85] },
    ]);
  });

  it('weight가 없는 페이지는 null로 읽힌다(구 레코드 하위호환)', () => {
    const s = buildSeries(records, 'mobile', METRICS.weight);
    expect(s[0].values).toEqual([null, null]);
  });

  it('데스크탑이 없는 레코드는 빈 배열 취급', () => {
    const s = buildSeries(records, 'desktop', METRICS.perf);
    expect(s).toEqual([]);
  });
});

describe('seriesDelta', () => {
  it('높을수록 좋은 지표는 증가가 개선(up)', () => {
    expect(seriesDelta([50, 55], false)).toEqual({
      last: 55,
      delta: 5,
      dir: 'up',
    });
  });

  it('낮을수록 좋은 지표는 감소가 개선(up)', () => {
    expect(seriesDelta([8000, 7000], true)).toMatchObject({
      last: 7000,
      dir: 'up',
    });
  });

  it('변화가 0.8% 미만이면 flat', () => {
    expect(seriesDelta([88, 88], false).dir).toBe('flat');
  });

  it('null은 건너뛰고 마지막 두 유효값으로 계산', () => {
    expect(seriesDelta([50, null, 55], false).dir).toBe('up');
  });

  it('유효값이 하나뿐이면 delta 없음', () => {
    expect(seriesDelta([null, 61], false)).toEqual({
      last: 61,
      delta: null,
      dir: 'flat',
    });
  });

  it('전부 null이면 last 없음', () => {
    expect(seriesDelta([null, null], false)).toEqual({
      last: null,
      delta: null,
      dir: 'flat',
    });
  });
});

describe('METRICS 판정', () => {
  it('성능 90 이상은 pass, 50~89 warn, 미만 fail', () => {
    expect(METRICS.perf.verdict!(92)).toBe('pass');
    expect(METRICS.perf.verdict!(61)).toBe('warn');
    expect(METRICS.perf.verdict!(40)).toBe('fail');
  });
  it('CLS 0.1 이하 pass', () => {
    expect(METRICS.cls.verdict!(0.05)).toBe('pass');
  });
  it('LCP 랩·전송은 판정 없음(null)', () => {
    expect(METRICS.lcp.verdict).toBeNull();
    expect(METRICS.weight.verdict).toBeNull();
  });
});

describe('weekLabel', () => {
  it('ISO를 MM/DD로', () => {
    expect(weekLabel('2026-07-07T12:00:00Z')).toMatch(/^0[67]\/0[678]$/);
  });
});

describe('buildTrendPayload', () => {
  it('weeks와 pages를 뽑고 폼팩터별 지표 시리즈를 담는다', () => {
    const records = [
      rec(
        '2026-07-07T00:00:00Z',
        [{ name: 'home', perf: 50 }],
        [{ name: 'home', perf: 70 }],
      ),
      rec(
        '2026-07-14T00:00:00Z',
        [{ name: 'home', perf: 55 }],
        [{ name: 'home', perf: 75 }],
      ),
    ];
    const p = buildTrendPayload(records);
    expect(p.weeks).toHaveLength(2);
    expect(p.pages).toEqual(['home']);
    expect(p.mobile.perf[0].values).toEqual([50, 55]);
    expect(p.desktop.perf[0].values).toEqual([70, 75]);
  });
});
