import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assembleRecord,
  type BuildPart,
  type LighthousePart,
  readPart,
  writePart,
} from './parts';
import type { PageMetrics } from './types';

const page = (name: string, formFactor: 'mobile' | 'desktop'): PageMetrics => ({
  name,
  url: `https://example.com/${name}`,
  formFactor,
  lighthouse: { performance: 90, accessibility: 100, bestPractices: 100, seo: 100 },
  cwv: { lcp: 2000, cls: 0, tbt: 100, fcp: 1000, si: 1500 },
});

const mobile: LighthousePart = {
  formFactor: 'mobile',
  pages: [page('home', 'mobile')],
  environment: {
    chromeVersion: '156.0.0.0',
    lighthouseVersion: '13.6.0',
    runnerImage: '20261101.360.1',
    benchmarkIndex: 3000,
  },
};

const desktop: LighthousePart = {
  formFactor: 'desktop',
  pages: [page('home', 'desktop')],
  environment: {
    chromeVersion: '156.0.0.0',
    lighthouseVersion: '13.6.0',
    runnerImage: '20261101.999.1',
    benchmarkIndex: 9999,
  },
};

const build: BuildPart = {
  gitRef: 'abc1234',
  build: {
    bundle: { totalFirstLoadKb: 300, routes: [] },
    buildTimeSec: 60,
    codeHealth: { tscErrors: 0, eslintErrors: 0, eslintWarnings: 1, todoFixme: 2 },
  },
  seo: {
    hreflangValid: true,
    canonicalValid: true,
    sitemapOk: true,
    robotsOk: true,
    jsonLdPresent: true,
    brokenLinks: 0,
  },
  runtime: { consoleErrors: 0, consoleWarnings: 0, failedRequests: 0, hydrationWarnings: 0 },
};

const app = { name: 'page0127', env: 'production' as const, targetUrl: 'https://example.com' };
const timestamp = '2026-11-16T00:00:00.000Z';

describe('assembleRecord', () => {
  it('조각들을 한 레코드로 합치고, 측정 환경은 모바일 러너 것을 쓴다', () => {
    const r = assembleRecord({ mobile, desktop, build, field: undefined, app, timestamp });
    expect(r.pages).toEqual(mobile.pages);
    expect(r.desktopPages).toEqual(desktop.pages);
    expect(r.environment).toEqual(mobile.environment);
    expect(r.gitRef).toBe('abc1234');
    expect(r.bundle.totalFirstLoadKb).toBe(300);
    expect(r.codeHealth.todoFixme).toBe(2);
    expect(r.timestamp).toBe(timestamp);
    expect('field' in r).toBe(false);
  });

  it('데스크톱 조각이 없으면 desktopPages 를 비운다(선택 항목)', () => {
    const r = assembleRecord({ mobile, desktop: undefined, build, field: undefined, app, timestamp });
    expect('desktopPages' in r).toBe(false);
  });

  it('모바일 조각이 없으면 실패한다(기준 시계열)', () => {
    expect(() =>
      assembleRecord({ mobile: undefined, desktop, build, field: undefined, app, timestamp })
    ).toThrow(/모바일/);
  });

  it('빌드 조각이 없으면 실패한다(번들 0 기록 방지)', () => {
    expect(() =>
      assembleRecord({ mobile, desktop, build: undefined, field: undefined, app, timestamp })
    ).toThrow(/빌드/);
  });
});

describe('writePart / readPart', () => {
  it('쓴 조각을 그대로 읽고, 없는 파일은 undefined', () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'quality-parts-')), 'nested');
    writePart(dir, 'x.json', { a: 1 });
    expect(readPart<{ a: number }>(dir, 'x.json')).toEqual({ a: 1 });
    expect(readPart(dir, 'missing.json')).toBeUndefined();
  });
});
