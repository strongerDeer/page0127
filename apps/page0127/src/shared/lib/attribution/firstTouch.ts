/**
 * 첫 방문 유입(first-touch) — "이 사람은 처음에 어디서 왔나"를 가입 때까지 들고 간다.
 *
 * 왜 필요한가:
 *   GA 는 이름 없는 방문 단위로 세고, 우리 DB 는 가입자 단위로 센다. 둘을 잇는 고리가 없어서
 *   "인스타 보고 온 사람이 실제로 가입했나"를 어디서도 알 수 없었다(2026-11-24 어드민 점검).
 *   그래서 처음 들어온 요청에서 출처를 쿠키에 적어 두고, 가입하는 순간 DB(signup_attributions)로 옮긴다.
 *
 * 무엇을 담나 — 출처 도메인·utm·첫 페이지 경로만. 전체 주소(검색어가 담길 수 있음)·IP 는 담지 않는다.
 * 쿠키는 httpOnly(브라우저 스크립트가 못 읽음), 30일.
 */

export const FIRST_TOUCH_COOKIE = 'p27_ft';
export const FIRST_TOUCH_MAX_AGE_SEC = 60 * 60 * 24 * 30;

/**
 * 앱 안 브라우저에서 "외부 브라우저로 열기"를 누를 때 붙이는 표시.
 * 사파리·크롬은 새 브라우저라 앱 안에서 심은 쿠키가 없다 — 이 값으로 출처를 이어 받는다.
 */
export const VIA_PARAM = 'via';
const VIA_APPS = new Set([
  'instagram',
  'threads',
  'facebook',
  'kakaotalk',
  'naver',
  'line',
]);

export type FirstTouch = {
  /** 출처: utm_source, 앱 이름(instagram 등), 들어온 사이트 도메인, 'share', 'direct' */
  source: string;
  /** utm_medium 또는 'inapp' | 'referral' | 'none' */
  medium: string;
  campaign: string | null;
  /** 들어오기 직전 사이트 도메인(Referer 의 host). 없으면 null */
  referrerHost: string | null;
  /** 처음 연 페이지 경로(쿼리 제외) */
  landingPath: string;
  /** 처음 온 시각(ISO) */
  firstSeenAt: string;
};

const MAX = { source: 60, medium: 30, campaign: 80, host: 100, path: 200 };

const clip = (v: string | null | undefined, n: number): string | null => {
  const s = (v ?? '').trim();
  return s ? s.slice(0, n) : null;
};

/** 'www.' 을 떼고 소문자로 — google.com 과 www.google.com 을 한 출처로 센다 */
const normalizeHost = (host: string): string =>
  host.toLowerCase().replace(/^www\./, '');

const refererHost = (referer: string | null): string | null => {
  if (!referer) return null;
  try {
    return normalizeHost(new URL(referer).host);
  } catch {
    return null;
  }
};

/** UA 로 아는 앱 안 브라우저 — inAppBrowser.APP_PATTERNS 와 같은 표식(other 제외) */
const IN_APP: [string, RegExp][] = [
  ['instagram', /Instagram/i],
  ['threads', /Barcelona/i],
  ['facebook', /FBAN|FBAV|FB_IAB|FBIOS/i],
  ['kakaotalk', /KAKAOTALK/i],
  ['naver', /NAVER\(inapp/i],
  ['line', /\bLine\//i],
];

export const buildFirstTouch = (input: {
  url: URL;
  referer: string | null;
  userAgent: string | null;
  /** 우리 사이트 host — 사이트 안 이동은 출처로 치지 않는다 */
  siteHost: string;
  now: Date;
}): FirstTouch => {
  const { url, userAgent, now } = input;
  const params = url.searchParams;
  const refHost = refererHost(input.referer);
  const internal =
    refHost !== null && refHost === normalizeHost(input.siteHost);
  const externalRef = internal ? null : refHost;

  const base = {
    campaign: clip(params.get('utm_campaign'), MAX.campaign),
    referrerHost: clip(externalRef, MAX.host),
    landingPath: clip(url.pathname, MAX.path) ?? '/',
    firstSeenAt: now.toISOString(),
  };

  // 1) utm 이 있으면 그게 제일 정확하다(직접 단 링크)
  const utmSource = clip(params.get('utm_source'), MAX.source);
  if (utmSource) {
    return {
      ...base,
      source: utmSource.toLowerCase(),
      medium: (
        clip(params.get('utm_medium'), MAX.medium) ?? 'none'
      ).toLowerCase(),
    };
  }

  // 2) 외부 브라우저로 넘어오며 붙인 표시
  const via = params.get(VIA_PARAM)?.toLowerCase();
  if (via && VIA_APPS.has(via)) {
    return { ...base, source: via, medium: 'inapp' };
  }

  // 3) 앱 안 브라우저 — 인스타·카톡 웹뷰는 Referer 를 안 보내는 경우가 많아 UA 로 판단한다
  const app = userAgent
    ? IN_APP.find(([, re]) => re.test(userAgent))?.[0]
    : undefined;
  if (app) return { ...base, source: app, medium: 'inapp' };

  // 4) 공유 링크(?from=share)
  if (params.get('from') === 'share') {
    return { ...base, source: 'share', medium: 'social' };
  }

  // 5) 다른 사이트에서 링크로
  if (externalRef) {
    return {
      ...base,
      source: clip(externalRef, MAX.source)!,
      medium: 'referral',
    };
  }

  // 6) 주소를 직접 쳤거나 북마크·앱 밖 메신저 등 Referer 가 없는 경우
  return { ...base, source: 'direct', medium: 'none' };
};

/** 봇·미리보기 크롤러는 사람이 아니다 — 쿠키를 심지 않는다 */
const BOT_RE =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|kakaotalk-scrap|yeti|lighthouse|headless/i;

/**
 * 이 요청에서 첫 방문을 기록할까.
 * 페이지(GET, 문서 요청)만, 이미 기록이 있거나 로그인한 사람은 건너뛴다.
 */
export const shouldRecordFirstTouch = (input: {
  method: string;
  pathname: string;
  hasCookie: boolean;
  isLoggedIn: boolean;
  userAgent: string | null;
  /** RSC·prefetch 요청이면 true — 사람이 주소창으로 연 첫 문서 요청만 센다 */
  isPrefetchOrRsc: boolean;
}): boolean => {
  if (input.hasCookie || input.isLoggedIn) return false;
  if (input.method !== 'GET' || input.isPrefetchOrRsc) return false;
  if (!input.userAgent || BOT_RE.test(input.userAgent)) return false;
  const p = input.pathname;
  if (p.startsWith('/api') || p.startsWith('/auth') || p.startsWith('/admin'))
    return false;
  // 파일 요청(robots.txt, sitemap.xml, 이미지 등)은 사람이 연 페이지가 아니다
  if (/\.[a-z0-9]{2,5}$/i.test(p)) return false;
  return true;
};

export const serializeFirstTouch = (ft: FirstTouch): string =>
  encodeURIComponent(JSON.stringify(ft));

/** 쿠키 값 → FirstTouch. 손댄 값·옛 형식이면 null(가입은 그대로 진행된다) */
export const parseFirstTouch = (
  raw: string | null | undefined
): FirstTouch | null => {
  if (!raw || raw.length > 2000) return null;
  try {
    const v: unknown = JSON.parse(decodeURIComponent(raw));
    if (!v || typeof v !== 'object') return null;
    const o = v as Record<string, unknown>;
    const str = (k: string, n: number) =>
      typeof o[k] === 'string' ? clip(o[k] as string, n) : null;
    const source = str('source', MAX.source);
    const medium = str('medium', MAX.medium);
    const landingPath = str('landingPath', MAX.path);
    const firstSeenAt = str('firstSeenAt', 40);
    if (!source || !medium || !landingPath || !firstSeenAt) return null;
    if (Number.isNaN(Date.parse(firstSeenAt))) return null;
    return {
      source,
      medium,
      campaign: str('campaign', MAX.campaign),
      referrerHost: str('referrerHost', MAX.host),
      landingPath,
      firstSeenAt,
    };
  } catch {
    return null;
  }
};
