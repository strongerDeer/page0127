import { summarizeRum, summarizeRumByDay } from '@repo/quality/rum';

import type { RumWindow } from '@/features/admin-quality/api/getQualityDashboard';
import type { RumMetricName } from '@repo/quality/rum';
import type { PageMetrics, QualityRecord } from '@repo/quality/types';

/**
 * 품질(/demo/admin/quality) 예시 — 주 1회 측정 기록 8주치와 실사용자 성능(RUM) 표본.
 *
 * 실제 화면은 GitHub Actions 가 매주 Lighthouse·CrUX 로 잰 기록(quality_records)을 읽는다.
 * 데모는 같은 QualityRecord 모양으로 적은 값을 넣고, RUM 은 실제와 같은 summarizeRum 에 돌린다.
 */

const WEEKS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 측정하는 페이지 — 실제 packages/quality/src/config.ts 의 이름과 같게 */
const PAGES: { name: string; path: string; perf: number; lcp: number }[] = [
  { name: 'home', path: '/', perf: 84, lcp: 2600 },
  { name: 'library', path: '/books/all', perf: 78, lcp: 3100 },
  { name: 'profile', path: '/demo_reader', perf: 81, lcp: 2800 },
  { name: 'sentence', path: '/sentence', perf: 90, lcp: 2100 },
  { name: 'typing', path: '/typing/little-prince', perf: 86, lcp: 2400 },
];

/** 가장 최근 측정에서 나빠진 항목 수 — 대시보드 "오늘 볼 것"과 맞춘다 */
export const DEMO_QUALITY_REGRESSIONS = 1;

const ORIGIN = 'https://page0127.com';

/** 주차 i(0=가장 오래됨)의 페이지 값 — 몇 주에 걸쳐 조금씩 좋아지다 마지막 주에 하나가 나빠진다 */
const pageAt = (
  page: (typeof PAGES)[number],
  week: number,
  desktop: boolean
): PageMetrics => {
  const improve = week * 1.2;
  // 마지막 주 서재(library) 성능이 떨어진 상황 — 리포트·회귀 띠가 이걸 짚는다
  const dip = !desktop && page.name === 'library' && week === WEEKS - 1 ? 9 : 0;
  const perf = Math.min(
    99,
    Math.round(page.perf - 8 + improve - dip + (desktop ? 12 : 0))
  );
  const lcp = Math.round(
    (page.lcp + 500 - week * 70 + dip * 60) * (desktop ? 0.45 : 1)
  );
  return {
    name: page.name,
    url: `${ORIGIN}${page.path}`,
    formFactor: desktop ? 'desktop' : 'mobile',
    lighthouse: {
      performance: perf,
      accessibility: page.name === 'library' ? 96 : 100,
      bestPractices: 100,
      seo: 100,
    },
    cwv: {
      lcp,
      cls: page.name === 'library' ? 0.02 : 0,
      tbt: Math.round(
        (desktop ? 40 : 260) - week * (desktop ? 2 : 12) + dip * 15
      ),
      fcp: Math.round(lcp * 0.55),
      si: Math.round(lcp * 0.9),
    },
    weight: {
      totalKb: 420 + (page.name === 'library' ? 180 : 0) - week * 6,
      imageKb: 120 + (page.name === 'library' ? 160 : 0),
      scriptKb: 210 - week * 4,
    },
    samples: 3,
  };
};

const REPORT_MD = `**핵심:** 지난주보다 대부분 페이지가 빨라졌지만, 서재 페이지 모바일 성능이 9점 떨어졌습니다.

**주요 발견**
- 홈·문장·필사 페이지는 4주 연속 성능 점수가 오르고 있습니다.
- 서재 페이지는 책 표지 이미지가 늘면서 첫 화면 무게가 커졌습니다.
- 실사용자 LCP(75%)는 2.1초로 '좋음' 기준(2.5초) 안에 있습니다.

**다음 주 우선순위**
1. 서재 표지 이미지 줄이기: 첫 화면 밖 표지는 늦게 불러오고, 크기를 화면에 맞춥니다.
2. 공통 스크립트 나누기: 처음에 안 쓰는 모듈은 화면이 뜬 뒤에 받습니다.
3. 측정 표본 늘리기: 페이지마다 3번씩 재는 것을 5번으로 늘려 흔들림을 줄입니다.`;

const recordAt = (week: number, now: Date): QualityRecord => {
  const at = new Date(now.getTime() - (WEEKS - 1 - week) * 7 * DAY_MS);
  // 측정은 월요일 아침 — 날짜만 맞으면 되므로 시각은 고정
  at.setUTCHours(0, 30, 0, 0);
  const pages = PAGES.map((p) => pageAt(p, week, false));
  const isLatest = week === WEEKS - 1;
  return {
    timestamp: at.toISOString(),
    app: 'page0127',
    env: 'production',
    targetUrl: ORIGIN,
    gitRef: `demo-${String(week + 1).padStart(2, '0')}`,
    pages,
    desktopPages: PAGES.map((p) => pageAt(p, week, true)),
    bundle: {
      totalFirstLoadKb: 312 - week * 5,
      routes: [
        { route: '/', firstLoadKb: 188 - week * 2 },
        { route: '/[username]', firstLoadKb: 236 - week * 3 },
        { route: '/books/all', firstLoadKb: 214 - week * 2 },
        { route: '/sentence', firstLoadKb: 171 - week },
      ],
    },
    buildTimeSec: 96 - week,
    field: {
      scope: 'origin',
      target: ORIGIN,
      periodStart: new Date(at.getTime() - 28 * DAY_MS)
        .toISOString()
        .slice(0, 10),
      periodEnd: at.toISOString().slice(0, 10),
      mobile: { lcp: 2150, inp: 120, cls: 0.01, fcp: 1300, ttfb: 640 },
      desktop: { lcp: 1200, inp: 60, cls: 0, fcp: 700, ttfb: 380 },
    },
    seo: {
      hreflangValid: true,
      canonicalValid: true,
      sitemapOk: true,
      robotsOk: true,
      jsonLdPresent: true,
      brokenLinks: 0,
    },
    runtime: {
      consoleErrors: 0,
      consoleWarnings: 2,
      failedRequests: 0,
      hydrationWarnings: 0,
    },
    codeHealth: {
      tscErrors: 0,
      eslintErrors: 0,
      eslintWarnings: 3,
      todoFixme: 11 - week,
    },
    analysisComment: isLatest ? REPORT_MD : undefined,
    regressions: isLatest
      ? [
          {
            metric: 'performance',
            page: 'library',
            formFactor: 'mobile',
            prev: pages[1].lighthouse.performance + 9,
            curr: pages[1].lighthouse.performance,
            detail: '서재 모바일 성능 점수 9점 하락',
          },
        ]
      : [],
  };
};

/** 오래된→최신 순 */
export const demoQualityRecords = (now: Date): QualityRecord[] =>
  Array.from({ length: WEEKS }, (_, w) => recordAt(w, now));

/** RUM 표본 — 하루 열댓 번 방문 × 28일, 값은 지표마다 그럴듯한 범위 */
export const demoRum = (now: Date): RumWindow => {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const base: Record<RumMetricName, [number, number]> = {
    lcp: [900, 2600],
    fcp: [500, 1700],
    ttfb: [200, 900],
    inp: [40, 220],
    cls: [0, 0.08],
  };
  const rows: { metric: RumMetricName; value: number; receivedAt: string }[] =
    [];
  for (let d = 0; d < 28; d++) {
    const day = new Date(now.getTime() - d * DAY_MS);
    const visits = 8 + Math.floor(rand() * 10);
    for (let v = 0; v < visits; v++) {
      for (const metric of Object.keys(base) as RumMetricName[]) {
        // CLS·INP 는 일부 브라우저만 보낸다 — 실제처럼 표본이 적다
        if ((metric === 'cls' || metric === 'inp') && rand() < 0.4) continue;
        const [lo, hi] = base[metric];
        rows.push({
          metric,
          value: lo + (hi - lo) * rand() * rand() * 1.4,
          receivedAt: day.toISOString(),
        });
      }
    }
  }
  return {
    windowDays: 28,
    truncated: false,
    summaries: summarizeRum(rows),
    trendMetric: 'lcp',
    trend: summarizeRumByDay(rows, 'lcp'),
  };
};
