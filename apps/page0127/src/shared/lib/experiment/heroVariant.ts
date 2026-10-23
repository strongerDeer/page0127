/**
 * 홈 히어로 A/B 그룹 — 설계: docs/superpowers/specs/2026-10-23-life-book-hero-ab-design.md
 *
 * - a: 지금 맛보기("이 중에 읽은 책이 있나요?" · 여러 권 고르기)
 * - b: "당신의 인생책은?" · 검색으로 한 권 찾기
 *
 * 그룹은 proxy.ts 가 처음 온 방문자에게 쿠키로 정해 준다. 클라이언트에서 랜덤으로 정하면
 * 서버가 그린 화면이 깜빡이며 바뀌고, 새로고침마다 그룹이 바뀌어 측정이 안 된다.
 * 쿠키를 httpOnly 로 두지 않는 이유: GA 사용자 속성으로 보내려면 브라우저가 읽어야 한다(trackEvent).
 */

export type HeroVariant = 'a' | 'b';

export const HERO_VARIANT_COOKIE = 'hero_variant';

/** 다시 와도 같은 그룹 — 실험 기간(2~4주)보다 넉넉하게 */
export const HERO_VARIANT_MAX_AGE_SEC = 60 * 60 * 24 * 90;

/** 스위치 — Vercel 환경 변수 HERO_AB=on 일 때만 실험한다. 꺼져 있으면 모두 A */
export const isHeroAbOn = (value: string | undefined): boolean =>
  value === 'on';

export const parseHeroVariant = (value: unknown): HeroVariant | null =>
  value === 'a' || value === 'b' ? value : null;

/** 50:50. 테스트에서 난수를 주입한다 */
export const pickHeroVariant = (
  random: () => number = Math.random
): HeroVariant => (random() < 0.5 ? 'a' : 'b');

/**
 * 화면에 쓸 그룹. 스위치가 꺼져 있으면 쿠키가 남아 있어도 A 다 — 쿠키보다 스위치가 먼저다.
 */
export const resolveHeroVariant = (
  cookieValue: string | undefined,
  abOn: boolean
): HeroVariant => (abOn ? (parseHeroVariant(cookieValue) ?? 'a') : 'a');

/**
 * 이 브라우저에서 로그인한 적이 있는가 — Supabase 인증 쿠키(`sb-<ref>-auth-token`, 길면
 * `.0`·`.1` 로 나뉜다)가 있는지로 본다.
 *
 * proxy 는 세션을 확인(getUser)하기 **전에** 그룹을 정해야 같은 요청의 화면이 그 그룹으로
 * 그려진다. 그래서 세션 대신 쿠키 이름으로 가른다. 만료된 세션이 남은 사람도 빠지는데,
 * 실험 대상이 "처음 온 사람"이라 오히려 맞다.
 */
export const hasAuthCookie = (cookieNames: string[]): boolean =>
  cookieNames.some((name) => /^sb-.+-auth-token(\.\d+)?$/.test(name));

type AssignInput = {
  abOn: boolean;
  pathname: string;
  cookieNames: string[];
  current: string | undefined;
};

/**
 * 그룹을 새로 정해야 하는가 — 홈(`/`)에 처음 온 비로그인 방문자만.
 * 공개 서재·책 상세로 들어온 사람은 홈에 올 때 정한다. 모든 경로에서 정하면
 * 히어로를 보지도 않은 사람이 그룹 수에 섞인다.
 */
export const shouldAssignHeroVariant = ({
  abOn,
  pathname,
  cookieNames,
  current,
}: AssignInput): boolean =>
  abOn &&
  pathname === '/' &&
  parseHeroVariant(current) === null &&
  !hasAuthCookie(cookieNames);

/** document.cookie 문자열에서 그룹을 읽는다 (브라우저용) */
export const readHeroVariantFromCookieString = (
  cookieString: string
): HeroVariant | null => {
  for (const part of cookieString.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === HERO_VARIANT_COOKIE) return parseHeroVariant(rest.join('='));
  }
  return null;
};
