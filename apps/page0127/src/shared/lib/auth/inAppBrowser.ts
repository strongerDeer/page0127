/**
 * 앱 안 브라우저(인앱 웹뷰) 판정
 *
 * 왜 필요한가:
 *   인스타 프로필 링크·카톡 링크를 누르면 그 앱 안의 웹뷰에서 열린다. 구글은 웹뷰 안의
 *   OAuth 를 `403 disallowed_useragent` 로 막기 때문에, 홍보로 들어온 사람이 구글 버튼을
 *   누르면 에러 화면만 보고 떠난다. 카카오는 웹뷰에서도 되지만 아이디·비밀번호를 직접
 *   쳐야 한다. 그래서 로그인 화면에서 "외부 브라우저로 열기"를 먼저 안내한다.
 *
 * User-Agent 판정은 완벽하지 않다(앱이 UA 를 바꾸면 놓친다). 놓치면 지금과 같아질 뿐이라
 * 오탐보다 미탐 쪽이 안전하다 — 그래서 확실한 표식만 본다.
 */

export type InAppApp =
  | 'instagram'
  | 'facebook'
  | 'threads'
  | 'kakaotalk'
  | 'naver'
  | 'line'
  | 'other';

export type InAppBrowser = {
  app: InAppApp;
  os: 'ios' | 'android' | 'other';
} | null;

const APP_PATTERNS: [InAppApp, RegExp][] = [
  ['instagram', /Instagram/i],
  // 스레드 앱 UA 의 코드명
  ['threads', /Barcelona/i],
  ['facebook', /FBAN|FBAV|FB_IAB|FBIOS/i],
  ['kakaotalk', /KAKAOTALK/i],
  ['naver', /NAVER\(inapp/i],
  ['line', /\bLine\//i],
  // 안드로이드 일반 웹뷰 표식 — "; wv)" (크롬 커스텀 탭에는 붙지 않는다)
  ['other', /; wv\)/],
];

export const detectInAppBrowser = (
  userAgent: string | null | undefined
): InAppBrowser => {
  if (!userAgent) return null;
  const match = APP_PATTERNS.find(([, pattern]) => pattern.test(userAgent));
  if (!match) return null;

  const os = /iPhone|iPad|iPod/i.test(userAgent)
    ? 'ios'
    : /Android/i.test(userAgent)
      ? 'android'
      : 'other';

  return { app: match[0], os };
};

/**
 * 외부 브라우저로 바로 여는 주소. 코드로 나갈 길이 없으면 null(안내 문구로 대신한다).
 * - 카카오톡: 공식 스킴 `kakaotalk://web/openExternal` (iOS·안드로이드 모두)
 * - 안드로이드: intent 스킴으로 크롬을 지정해 연다
 * - iOS 인스타·페이스북 등: 웹에서 사파리를 여는 방법이 없다
 */
export const externalOpenUrl = (
  browser: NonNullable<InAppBrowser>,
  url: string
): string | null => {
  if (browser.app === 'kakaotalk') {
    return `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
  }
  if (browser.os === 'android') {
    const { host, pathname, search, hash } = new URL(url);
    return `intent://${host}${pathname}${search}${hash}#Intent;scheme=https;package=com.android.chrome;end`;
  }
  return null;
};
