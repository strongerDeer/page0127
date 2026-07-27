// 자체 RUM(실사용자 성능) — 타입과 순수 함수.
//
// CrUX(crux.ts)와 무엇이 다른가: CrUX는 이미 집계된 **28일 이동창 p75**를 받아 적는다.
// 여기는 **개별 방문의 값**을 받아 조회 시점에 집계한다. 둘은 다른 것을 재는 다른 숫자라
// 저장소도 화면도 분리한다. 판단 근거: apps/page0127/docs/rum-field-metrics.md
//
// 이 파일에 런타임 의존성을 두지 않는다(타입 import만). 브라우저 번들·라우트 핸들러·
// 대시보드 서버 컴포넌트가 모두 이 파일을 가져다 쓰기 때문이다.

import type { FormFactor } from './types.ts';

export type RumMetricName = 'lcp' | 'inp' | 'cls' | 'fcp' | 'ttfb';
export type RumRating = 'good' | 'needs-improvement' | 'poor';
export type RumBrowser = 'chrome' | 'safari' | 'firefox' | 'edge' | 'other';
export type RumEnv = 'production' | 'preview' | 'development';

export const RUM_METRICS: RumMetricName[] = ['lcp', 'inp', 'cls', 'fcp', 'ttfb'];

/** 브라우저가 보내는 샘플 하나. DB 컬럼과 1:1 (snake_case 변환은 라우트 핸들러가 한다). */
export type RumSample = {
  metric: RumMetricName;
  value: number;
  rating?: RumRating;
  /** web-vitals가 페이지 로드마다 지표별로 발급하는 고유 id. 재보고 시 중복 제거 키. */
  metricId: string;
  /** 정규화된 라우트 패턴. 원문 경로가 아니다 — normalizeRoute() 참고. */
  route: string;
  formFactor: FormFactor;
  browser: RumBrowser;
  navigationType?: string;
  sessionId: string;
  attribution?: Record<string, unknown>;
  env: RumEnv;
  release?: string;
};

// ── 라우트 정규화 ────────────────────────────────────────────────────────
//
// 원문 경로(`/dreamfulbud/80a21270-…`)를 그대로 저장하면 두 가지가 깨진다:
//   1. 사용자명·책 id가 성능 로그에 남는다(수집 최소화 원칙 위반).
//   2. 카디널리티가 방문 수만큼 늘어 "어느 화면이 느린가"를 그룹핑할 수 없다.
// 그래서 **알려진 라우트만 통과시키고 나머지는 자리표시자로 접는다.** 허용목록 방식이라
// 새 라우트가 생기면 여기서 누락돼 `[id]`로 접힐 뿐, 카디널리티가 터지지 않는다.

const ROOT_ROUTES = new Set([
  'about',
  'admin',
  'auth',
  'books',
  'contact',
  'dashboard',
  'feed',
  'login',
  'notifications',
  'privacy',
  'search',
  'settings',
  'terms',
]);

/** 부모 세그먼트 → 그 아래 허용되는 정적 자식들. */
const CHILD_ROUTES: Record<string, Set<string>> = {
  admin: new Set([
    'analytics',
    'banners',
    'costs',
    'errors',
    'members',
    'quality',
  ]),
  auth: new Set(['auth-code-error', 'callback', 'suspended']),
  books: new Set(['add', 'all', 'info']),
  dashboard: new Set(['taste-analysis']),
};

/** 부모 세그먼트 → 그 아래 동적 세그먼트에 붙일 이름. 없으면 '[id]'. */
const DYNAMIC_LABEL: Record<string, string> = {
  books: '[id]',
  feed: '[activityId]',
  members: '[id]',
};

/**
 * 동적 세그먼트 **뒤에** 붙는 정적 액션(`/books/[id]/edit`). 부모가 id라 CHILD_ROUTES로는
 * 못 잡는다. 접어 버리면 편집 화면이 상세 화면과 같은 그룹이 되어 "어느 화면이 느린가"가
 * 흐려진다(실제 라우트 트리 확인: /books/[id]/edit · /[username]/[bookId]/edit).
 */
const ACTION_SEGMENTS = new Set(['edit']);

// 더 깊은 경로는 잘라낸다. 실제 라우트 트리 최대 깊이가 3이라 4면 충분하고,
// 이상한 요청이 와도 결과 문자열 길이가 유계로 유지된다.
const MAX_SEGMENTS = 4;

/**
 * 실제 pathname → 라우트 패턴.
 *
 * 첫 세그먼트가 알려진 라우트가 아니면 **사용자 프로필**로 본다(`/[username]`).
 * 이건 앱의 라우트 구조 그대로다 — `app/(public)/[username]/`가 최상위 캐치올이다.
 */
export const normalizeRoute = (pathname: string): string => {
  const path = pathname.split('?')[0]?.split('#')[0] ?? '';
  const segments = path.split('/').filter(Boolean).slice(0, MAX_SEGMENTS);

  const first = segments[0];
  if (!first) return '/';

  // `/[username]` 이하 — 프로필, 궁합, 책 상세와 그 편집만 존재한다.
  if (!ROOT_ROUTES.has(first)) {
    const second = segments[1];
    if (!second) return '/[username]';
    if (second === 'compatibility') return '/[username]/compatibility';
    return segments[2] === 'edit'
      ? '/[username]/[bookId]/edit'
      : '/[username]/[bookId]';
  }

  const out = [first];
  let parent = first;
  for (const segment of segments.slice(1)) {
    if (CHILD_ROUTES[parent]?.has(segment) || ACTION_SEGMENTS.has(segment)) {
      out.push(segment);
      parent = segment;
      continue;
    }
    out.push(DYNAMIC_LABEL[parent] ?? '[id]');
    parent = segment;
  }
  return `/${out.join('/')}`;
};

// ── 집계 ────────────────────────────────────────────────────────────────

/**
 * nearest-rank 분위수. 보간하지 않는다 — 실제로 어떤 방문에서 관측된 값이라야
 * "이 사용자가 이만큼 기다렸다"로 읽힌다.
 *
 * 표본이 없으면 **undefined**를 돌려준다. 0이 아니다 — "데이터 없음"과 "값 0"을
 * 섞으면 결측이 완벽한 성능으로 둔갑한다(crux.ts의 `Number(null) === 0` 전례).
 */
export const percentile = (
  values: number[],
  p: number
): number | undefined => {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  const index = Math.min(Math.max(rank, 0), sorted.length - 1);
  return sorted[index];
};

// CWV 표준 임계 [good 상한, poor 하한]. web.dev 공식 값이며 crux.ts의 histogram bin,
// 대시보드 verdict.ts와 같은 숫자다(세 곳이 어긋나면 같은 값에 다른 색이 칠해진다).
export const RUM_THRESHOLDS: Record<RumMetricName, [number, number]> = {
  lcp: [2500, 4000],
  inp: [200, 500],
  cls: [0.1, 0.25],
  fcp: [1800, 3000],
  ttfb: [800, 1800],
};

export const rateRumValue = (
  metric: RumMetricName,
  value: number
): RumRating => {
  const [good, poor] = RUM_THRESHOLDS[metric];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
};

// 표본 수에 따른 신뢰도. 샘플 5건의 p75는 숫자일 뿐 지표가 아니다.
// 임계는 통계적 유의성이 아니라 실무적 하한이다 — 이 규모에서 30건이면 대략 며칠치이고,
// 그보다 적으면 방문 한 건이 p75를 통째로 흔든다.
export const RUM_MIN_SAMPLES = { value: 10, verdict: 30 } as const;

/** 'none' 표본 0 · 'too-few' 값 숨김 · 'low' 값 표시하되 판정 보류 · 'ok' 판정 가능 */
export type RumConfidence = 'none' | 'too-few' | 'low' | 'ok';

export const rumConfidence = (count: number): RumConfidence => {
  if (count <= 0) return 'none';
  if (count < RUM_MIN_SAMPLES.value) return 'too-few';
  if (count < RUM_MIN_SAMPLES.verdict) return 'low';
  return 'ok';
};

export type RumMetricSummary = {
  metric: RumMetricName;
  /** 이 지표를 **보고한** 방문 수. 전체 방문 수가 아니다 — CLS는 Chromium에서만 온다. */
  count: number;
  p75: number;
  confidence: RumConfidence;
  /** 등급별 비율(0~1, 합 1). CrUX의 good/needsImprovement/poor 밀도와 같은 의미. */
  good: number;
  needsImprovement: number;
  poor: number;
};

type RumValueRow = { metric: RumMetricName; value: number };

/**
 * 지표별 요약. **표본이 하나도 없는 지표는 결과에서 빠진다** — count 0인 항목을
 * 만들어 두면 화면이 "0ms"나 "0%"를 그럴듯하게 그려 버린다.
 */
export const summarizeRum = (rows: RumValueRow[]): RumMetricSummary[] => {
  const byMetric = new Map<RumMetricName, number[]>();
  for (const row of rows) {
    if (!Number.isFinite(row.value)) continue;
    const bucket = byMetric.get(row.metric);
    if (bucket) bucket.push(row.value);
    else byMetric.set(row.metric, [row.value]);
  }

  const summaries: RumMetricSummary[] = [];
  for (const metric of RUM_METRICS) {
    const values = byMetric.get(metric);
    if (!values || values.length === 0) continue;

    const p75 = percentile(values, 75);
    if (p75 === undefined) continue;

    let good = 0;
    let needsImprovement = 0;
    for (const value of values) {
      const rating = rateRumValue(metric, value);
      if (rating === 'good') good += 1;
      else if (rating === 'needs-improvement') needsImprovement += 1;
    }
    const count = values.length;
    summaries.push({
      metric,
      count,
      p75,
      confidence: rumConfidence(count),
      good: good / count,
      needsImprovement: needsImprovement / count,
      poor: (count - good - needsImprovement) / count,
    });
  }
  return summaries;
};

export type RumDailyPoint = { day: string; count: number; p75: number };

type RumTimedRow = RumValueRow & { receivedAt: string };

/**
 * 한 지표의 일별 p75 추세. 날짜는 **UTC 기준 YYYY-MM-DD**다.
 *
 * KST로 접지 않는 이유: 저장이 timestamptz라 시간대 변환을 화면단 한 곳에서만 하면
 * 되는데, 여기서 KST로 접으면 서버·DB·화면 셋이 각자 시간대를 갖게 된다. 하루 경계가
 * 9시간 밀리는 건 추세 그래프에서 문제가 되지 않는다.
 */
export const summarizeRumByDay = (
  rows: RumTimedRow[],
  metric: RumMetricName
): RumDailyPoint[] => {
  const byDay = new Map<string, number[]>();
  for (const row of rows) {
    if (row.metric !== metric || !Number.isFinite(row.value)) continue;
    const day = row.receivedAt.slice(0, 10);
    const bucket = byDay.get(day);
    if (bucket) bucket.push(row.value);
    else byDay.set(day, [row.value]);
  }

  const points: RumDailyPoint[] = [];
  for (const [day, values] of byDay) {
    const p75 = percentile(values, 75);
    if (p75 === undefined) continue;
    points.push({ day, count: values.length, p75 });
  }
  return points.sort((a, b) => a.day.localeCompare(b.day));
};
