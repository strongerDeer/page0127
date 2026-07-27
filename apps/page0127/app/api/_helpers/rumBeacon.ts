/**
 * RUM 비콘 파싱·검증 — 순수 함수 (프레임워크 의존성 없음).
 *
 * 브라우저가 보내는 값은 **전부 못 믿는다.** 누구나 curl로 아무 값이나 밀어넣을 수 있고,
 * 그러면 품질 지표가 조용히 오염된다. 그래서 이 파일이 다음을 강제한다:
 *   - 지표 이름·값 범위·문자열 길이·배치 크기를 서버가 다시 검증
 *   - 라우트 정규화를 **서버가** 수행(클라이언트가 보낸 route 문자열을 믿지 않는다.
 *     믿으면 임의 문자열로 카디널리티를 터뜨릴 수 있다)
 *   - env·release는 서버 환경변수에서만 채운다(클라이언트가 못 정한다)
 *
 * 판단 근거: apps/page0127/docs/rum-field-metrics.md
 */

import {
  normalizeRoute,
  RUM_METRICS,
  type RumBrowser,
  type RumEnv,
  type RumMetricName,
  type RumRating,
  type RumSample,
} from '@repo/quality/rum';

import type { FormFactor } from '@repo/quality/types';

// 한 번에 받는 샘플 수. 지표 5종이 전부라 넉넉히 잡아도 8이면 충분하다.
// (bfcache 복귀로 같은 지표가 다시 실릴 수 있어 5가 아니라 8)
const MAX_SAMPLES = 8;

const MAX_LENGTH = {
  metricId: 64,
  sessionId: 64,
  path: 512,
  navigationType: 32,
  attributionJson: 2048,
} as const;

// 값의 상한. 진짜 느린 회선의 이상치는 살리되(10분) 명백한 쓰레기·조작은 자른다.
// CLS는 무단위 누적값이라 스케일이 완전히 다르다 — 10을 넘으면 실측일 수 없다.
const MAX_VALUE: Record<RumMetricName, number> = {
  lcp: 600_000,
  inp: 600_000,
  fcp: 600_000,
  ttfb: 600_000,
  cls: 10,
};

const RATINGS: RumRating[] = ['good', 'needs-improvement', 'poor'];

// web-vitals v6 Metric['navigationType'] 전체. 이 밖의 값은 버린다(컬럼 카디널리티 보호).
// 'soft-navigation'은 soft-navs 빌드에서만 오지만 타입 유니온에 있으므로 함께 허용한다.
const NAVIGATION_TYPES = [
  'navigate',
  'reload',
  'back-forward',
  'back-forward-cache',
  'prerender',
  'restore',
  'soft-navigation',
];

export type RumBeaconContext = {
  userAgent: string | null;
  env: RumEnv;
  release?: string;
};

export type RumBeaconResult =
  | { ok: true; samples: RumSample[] }
  | { ok: false; status: number; message: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const str = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return undefined;
  return trimmed;
};

// ── User-Agent 판독 ──────────────────────────────────────────────────────
//
// UA 문자열도 위조 가능하지만, 클라이언트가 JSON 필드로 직접 정하게 두는 것보다는
// 낫고 봇 대부분은 자기를 정직하게 밝힌다. 정밀 식별이 목적이 아니라 **집계를 나눌
// 축**이 목적이므로 이 정도 해상도면 충분하다.

const BOT_PATTERN =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|pingdom|gtmetrix|semrush|ahrefs|facebookexternalhit|whatsapp|curl|wget|python-requests|axios|node-fetch/i;

/** 봇·합성 측정 트래픽인가. 이건 실사용자 지표가 아니므로 저장하지 않는다. */
export const isBotUserAgent = (userAgent: string | null): boolean => {
  if (!userAgent) return true; // UA 없는 요청 = 스크립트. 실사용자 브라우저는 항상 보낸다.
  return BOT_PATTERN.test(userAgent);
};

export const detectFormFactor = (userAgent: string | null): FormFactor =>
  userAgent && /Mobi|Android|iPhone|iPod|iPad|Tablet/i.test(userAgent)
    ? 'mobile'
    : 'desktop';

/**
 * 브라우저 계열. **순서가 중요하다** — Edge/Chrome UA에는 'Safari'가, Edge UA에는
 * 'Chrome'이 들어 있어 좁은 것부터 봐야 한다. 순서를 뒤집으면 Edge 사용자가 전부
 * Chrome으로 집계된다.
 */
export const detectBrowser = (userAgent: string | null): RumBrowser => {
  if (!userAgent) return 'other';
  if (/Edg[eA-Z]?\//i.test(userAgent)) return 'edge';
  if (/Firefox\/|FxiOS\//i.test(userAgent)) return 'firefox';
  if (/Chrome\/|CriOS\//i.test(userAgent)) return 'chrome';
  if (/Safari\//i.test(userAgent)) return 'safari';
  return 'other';
};

// ── 본문 파싱 ────────────────────────────────────────────────────────────

const parseAttribution = (
  value: unknown
): Record<string, unknown> | undefined => {
  if (!isRecord(value)) return undefined;
  // 직렬화 크기로만 자른다. attribution 스키마는 지표마다 다르고 web-vitals 버전에
  // 따라 필드가 늘기도 해서, 화이트리스트로 묶으면 새 필드가 조용히 사라진다.
  const json = JSON.stringify(value);
  if (json.length > MAX_LENGTH.attributionJson) return undefined;
  return value;
};

const parseSample = (
  raw: unknown,
  sessionId: string,
  context: RumBeaconContext
): RumSample | undefined => {
  if (!isRecord(raw)) return undefined;

  // 경로는 샘플마다 다르다. LCP·FCP·TTFB는 최초 로드 때 확정되지만 CLS·INP는 페이지가
  // 숨겨질 때 확정돼, 그사이 클라이언트 라우팅이 일어났으면 다른 화면일 수 있다.
  // 그래서 "지표가 보고된 시점의 경로"를 샘플마다 들고 온다.
  const path = str(raw.path, MAX_LENGTH.path);
  if (!path || !path.startsWith('/')) return undefined;

  const metric = raw.metric;
  if (typeof metric !== 'string') return undefined;
  if (!RUM_METRICS.includes(metric as RumMetricName)) return undefined;
  const name = metric as RumMetricName;

  const value = raw.value;
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  if (value < 0 || value > MAX_VALUE[name]) return undefined;

  const metricId = str(raw.id, MAX_LENGTH.metricId);
  if (!metricId) return undefined;

  const rating =
    typeof raw.rating === 'string' && RATINGS.includes(raw.rating as RumRating)
      ? (raw.rating as RumRating)
      : undefined;

  const navigationTypeRaw = str(raw.navigationType, MAX_LENGTH.navigationType);
  const navigationType =
    navigationTypeRaw && NAVIGATION_TYPES.includes(navigationTypeRaw)
      ? navigationTypeRaw
      : undefined;

  const attribution = parseAttribution(raw.attribution);

  return {
    metric: name,
    value,
    ...(rating ? { rating } : {}),
    metricId,
    // 클라이언트가 보낸 route 문자열은 쓰지 않는다 — 임의 값으로 카디널리티를 터뜨릴 수
    // 있어서, 원문 path를 받아 **서버가** 패턴으로 접는다.
    route: normalizeRoute(path),
    formFactor: detectFormFactor(context.userAgent),
    browser: detectBrowser(context.userAgent),
    ...(navigationType ? { navigationType } : {}),
    sessionId,
    ...(attribution ? { attribution } : {}),
    env: context.env,
    ...(context.release ? { release: context.release } : {}),
  };
};

/**
 * 비콘 본문 → 저장할 샘플들.
 *
 * 개별 샘플이 규칙에 어긋나면 **그 샘플만 조용히 버리고** 나머지는 살린다. 비콘은
 * 재시도가 없어서 하나 때문에 전부 400을 돌려주면 멀쩡한 지표까지 잃는다. 다만 본문
 * 자체가 형태를 안 갖췄으면 400으로 돌려준다(클라이언트 버그를 조용히 삼키지 않는다).
 */
export const parseRumBeacon = (
  body: unknown,
  context: RumBeaconContext
): RumBeaconResult => {
  if (!isRecord(body)) {
    return { ok: false, status: 400, message: '본문이 객체가 아닙니다.' };
  }

  const sessionId = str(body.sessionId, MAX_LENGTH.sessionId);
  if (!sessionId) {
    return { ok: false, status: 400, message: 'sessionId가 없습니다.' };
  }

  const rawSamples = body.samples;
  if (!Array.isArray(rawSamples) || rawSamples.length === 0) {
    return { ok: false, status: 400, message: 'samples가 비어 있습니다.' };
  }
  if (rawSamples.length > MAX_SAMPLES) {
    return { ok: false, status: 413, message: 'samples가 너무 많습니다.' };
  }

  const samples: RumSample[] = [];
  for (const raw of rawSamples) {
    const sample = parseSample(raw, sessionId, context);
    if (sample) samples.push(sample);
  }

  return { ok: true, samples };
};

/** 서버 환경 → 저장할 env 값. Vercel이 주는 VERCEL_ENV가 유일한 진실이다. */
export const resolveRumEnv = (): RumEnv => {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === 'production') return 'production';
  if (vercelEnv === 'preview') return 'preview';
  return 'development';
};
