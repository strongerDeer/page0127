import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { appendRecord, readHistory } from './store';
import type { QualityRecord } from './types';

const makeRecord = (overrides: Partial<QualityRecord> = {}): QualityRecord => ({
  timestamp: '2026-05-26T09:00:00Z',
  app: 'shop',
  env: 'production',
  targetUrl: 'https://shop.novera.town',
  gitRef: 'abc1234',
  pages: [],
  bundle: { totalFirstLoadKb: 200, routes: [] },
  buildTimeSec: 40,
  seo: { hreflangValid: true, canonicalValid: true, sitemapOk: true, robotsOk: true, jsonLdPresent: true, brokenLinks: 0 },
  runtime: { consoleErrors: 0, consoleWarnings: 0, failedRequests: 0, hydrationWarnings: 0 },
  codeHealth: { tscErrors: 0, eslintErrors: 0, eslintWarnings: 0, todoFixme: 0 },
  ...overrides,
});

describe('store', () => {
  it('readHistory가 없는 파일이면 빈 history를 반환한다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'q-'));
    const path = join(dir, 'missing.json');
    expect(readHistory(path)).toEqual({ schemaVersion: 1, history: [] });
  });

  it('appendRecord가 기존 history 뒤에 레코드를 추가한다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'q-'));
    const path = join(dir, 'data.json');
    writeFileSync(path, JSON.stringify({ schemaVersion: 1, history: [makeRecord()] }));

    appendRecord(path, makeRecord({ gitRef: 'def5678' }));

    const saved = JSON.parse(readFileSync(path, 'utf8'));
    expect(saved.history).toHaveLength(2);
    expect(saved.history[1].gitRef).toBe('def5678');
  });

  // regressions 를 레코드에 남기지 않으면, JSON 만 읽는 소비자(스킬 스크립트 등)가
  // 조용히 "회귀 0건"을 보게 된다. 저장·복원을 라운드트립으로 고정한다.
  it('regressions·suppressedRegressions가 formFactor까지 보존된다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'q-'));
    const path = join(dir, 'data.json');

    appendRecord(
      path,
      makeRecord({
        regressions: [
          { metric: 'lcp', page: 'home', formFactor: 'desktop', prev: 1900, curr: 3200, detail: '[desktop] home LCP 1900→3200ms' },
          { metric: 'bundle', prev: 200, curr: 240, detail: '번들 200KB→240KB' },
        ],
        suppressedRegressions: [
          { metric: 'performance', page: 'list', formFactor: 'mobile', prev: 70, curr: 60, detail: 'list Performance 70→60' },
        ],
      })
    );

    const saved = readHistory(path);
    const rec = saved.history[0];
    expect(rec.regressions).toHaveLength(2);
    expect(rec.regressions?.[0].formFactor).toBe('desktop');
    // 번들은 폼팩터 무관 지표라 formFactor가 없다 — 읽는 쪽은 'mobile'로 폴백하면 안 된다.
    expect(rec.regressions?.[1].formFactor).toBeUndefined();
    expect(rec.suppressedRegressions?.[0].metric).toBe('performance');
  });

  it('구 레코드의 regressions는 undefined다 — 빈 배열(회귀 0건)과 구분되어야 한다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'q-'));
    const path = join(dir, 'data.json');
    appendRecord(path, makeRecord()); // regressions 미지정 = 2026-07-09 이전 레코드

    const rec = readHistory(path).history[0];
    expect(rec.regressions).toBeUndefined();
    expect(rec.regressions).not.toEqual([]); // "기록 없음" ≠ "회귀 0건"
  });
});
