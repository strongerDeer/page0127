import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

import type {
  CoreWebVitals,
  FormFactor,
  LighthouseScores,
  WeightMetrics,
} from './types';

export type LighthouseResult = {
  lighthouse: LighthouseScores;
  cwv: CoreWebVitals;
  weight: WeightMetrics;
};

// 중앙값(median): 정렬 후 가운데. 짝수 표본이면 두 가운데 평균을 반올림.
// 단발 Lighthouse 의 LCP/SI 노이즈를 걷어내는 핵심 도구.
export const median = (nums: number[]): number => {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

const score = (v: number | null | undefined): number =>
  Math.round((v ?? 0) * 100);

const kb = (bytes: number | null | undefined): number =>
  Math.round((bytes ?? 0) / 1024);

// Lighthouse `resource-summary` audit 에서 리소스 유형별 transferSize 추출.
const extractWeight = (audits: Record<string, unknown>): WeightMetrics => {
  const summary = audits['resource-summary'] as
    | { details?: { items?: { resourceType?: string; transferSize?: number }[] } }
    | undefined;
  const items = summary?.details?.items ?? [];
  const byType = (type: string): number =>
    kb(items.find((i) => i.resourceType === type)?.transferSize);
  return {
    totalKb: byType('total'),
    imageKb: byType('image'),
    scriptKb: byType('script'),
  };
};

// 단발 측정. measureLighthouseMedian 의 내부 표본 1회로도 쓰인다.
// formFactor='mobile'(기본)은 Lighthouse 기본 프리셋(느린4G·CPU 4x 스로틀),
// 'desktop'은 lighthouse 번들 desktop-config(빠른4G·CPU 스로틀 없음·1350x940).
export const measureLighthouse = async (
  url: string,
  formFactor: FormFactor = 'mobile'
): Promise<LighthouseResult> => {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  try {
    const runnerResult = await lighthouse(
      url,
      {
        port: chrome.port,
        output: 'json',
        onlyCategories: [
          'performance',
          'accessibility',
          'best-practices',
          'seo',
        ],
      },
      formFactor === 'desktop' ? desktopConfig : undefined
    );
    if (!runnerResult) throw new Error(`Lighthouse 결과 없음: ${url}`);
    const { categories, audits } = runnerResult.lhr;
    const numeric = (id: string): number =>
      Math.round(audits[id]?.numericValue ?? 0);

    return {
      lighthouse: {
        performance: score(categories.performance?.score),
        accessibility: score(categories.accessibility?.score),
        bestPractices: score(categories['best-practices']?.score),
        seo: score(categories.seo?.score),
      },
      cwv: {
        lcp: numeric('largest-contentful-paint'),
        cls: Number(
          (audits['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3)
        ),
        tbt: numeric('total-blocking-time'),
        fcp: numeric('first-contentful-paint'),
        si: numeric('speed-index'),
      },
      weight: extractWeight(audits as Record<string, unknown>),
    };
  } finally {
    await chrome.kill();
  }
};

export type MedianLighthouseResult = LighthouseResult & {
  samples: number;
  lcpSpreadMs: number; // 표본 LCP 최대-최소
  tbtSpreadMs: number; // 표본 TBT 최대-최소
};

// N회 측정 후 각 지표의 중앙값을 취해 노이즈를 제거한다.
// 바이트(weight)는 표본 간 안정적이라 median 이 곧 대표값.
// lcpSpreadMs(최대-최소)로 "이 LCP가 얼마나 못 믿을 값인지"를 함께 남긴다.
export const measureLighthouseMedian = async (
  url: string,
  runs: number,
  formFactor: FormFactor = 'mobile'
): Promise<MedianLighthouseResult> => {
  const n = Math.max(1, Math.floor(runs));
  const results: LighthouseResult[] = [];
  for (let i = 0; i < n; i += 1) {
    results.push(await measureLighthouse(url, formFactor));
  }
  const pick = (f: (r: LighthouseResult) => number): number =>
    median(results.map(f));
  const lcps = results.map((r) => r.cwv.lcp);
  const tbts = results.map((r) => r.cwv.tbt);

  return {
    lighthouse: {
      performance: pick((r) => r.lighthouse.performance),
      accessibility: pick((r) => r.lighthouse.accessibility),
      bestPractices: pick((r) => r.lighthouse.bestPractices),
      seo: pick((r) => r.lighthouse.seo),
    },
    cwv: {
      lcp: pick((r) => r.cwv.lcp),
      cls: Number(median(results.map((r) => r.cwv.cls * 1000)) / 1000),
      tbt: pick((r) => r.cwv.tbt),
      fcp: pick((r) => r.cwv.fcp),
      si: pick((r) => r.cwv.si),
    },
    weight: {
      totalKb: pick((r) => r.weight.totalKb),
      imageKb: pick((r) => r.weight.imageKb),
      scriptKb: pick((r) => r.weight.scriptKb),
    },
    samples: n,
    lcpSpreadMs: lcps.length ? Math.max(...lcps) - Math.min(...lcps) : 0,
    tbtSpreadMs: tbts.length ? Math.max(...tbts) - Math.min(...tbts) : 0,
  };
};
