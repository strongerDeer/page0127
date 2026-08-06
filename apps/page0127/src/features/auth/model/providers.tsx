/**
 * 로그인에 쓰는 소셜 프로바이더 정의 — 프로바이더가 늘 때 손대는 곳은 여기 하나다.
 *
 * 브랜드 마크를 왜 인라인 SVG 로 두는가:
 * `@repo/icons` 의 Icons 는 아이콘을 런타임에 api.iconify.design 에서 받아오는데,
 * 우리 CSP connect-src 가 그 호스트를 허용하지 않는다. 그래서 지금까지 운영
 * 로그인 화면의 구글 아이콘이 **아예 렌더되지 않고 있었다**(2026-08-06 확인).
 * 아이콘 두 개 때문에 모든 페이지에 서드파티 연결을 열 이유가 없어 여기 박아 둔다.
 */

export type OAuthProvider = 'google' | 'kakao';

type ProviderMeta = {
  /** 버튼에 적히는 문구 */
  label: string;
  /** 버튼 스타일 — 브랜드가 규정하는 경우에만 색을 박는다 */
  className: string;
  mark: React.ReactNode;
};

// 구글 G 마크 — 4색 규정이라 currentColor 를 쓰지 않는다
const GoogleMark = (
  <svg aria-hidden viewBox='0 0 24 24' className='size-5'>
    <path
      fill='#4285F4'
      d='M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.63h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.55Z'
    />
    <path
      fill='#34A853'
      d='M12 23.5c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.03-6.45-4.75H1.7v2.98A11.5 11.5 0 0 0 12 23.5Z'
    />
    <path
      fill='#FBBC05'
      d='M5.55 14.17a6.9 6.9 0 0 1 0-4.34V6.85H1.7a11.5 11.5 0 0 0 0 10.3l3.85-2.98Z'
    />
    <path
      fill='#EA4335'
      d='M12 5.08c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.72 1.63 15.11.5 12 .5A11.5 11.5 0 0 0 1.7 6.85l3.85 2.98C6.46 7.11 9 5.08 12 5.08Z'
    />
  </svg>
);

// 카카오 말풍선 심볼 — 배경이 #FEE500 이라 심볼은 검정으로 규정돼 있다
const KakaoMark = (
  <svg aria-hidden viewBox='0 0 24 24' className='size-5' fill='#000000'>
    <path d='M12 3C6.99 3 3 6.2 3 10.14c0 2.52 1.68 4.73 4.2 6l-1.05 3.9c-.09.34.28.6.57.4l4.62-3.06c.22.02.44.03.66.03 5.01 0 9-3.2 9-7.27C21 6.2 17.01 3 12 3Z' />
  </svg>
);

/**
 * 카카오 버튼은 카카오가 디자인을 규정한다 — 배경 #FEE500, 글자·심볼은 검정,
 * 문구는 "카카오 로그인". 우리 디자인 토큰 밖의 색이지만 **외부 계약이라
 * 토큰의 관할이 아니다.** 토큰 시스템을 깨는 게 아니라는 뜻으로 여기 적어 둔다.
 * → https://developers.kakao.com/docs/latest/ko/kakaologin/design-guide
 */
export const OAUTH_PROVIDERS: Record<OAuthProvider, ProviderMeta> = {
  google: {
    label: '구글로 계속하기',
    className:
      'border border-line bg-card text-text-body hover:bg-accent hover:text-accent-foreground',
    mark: GoogleMark,
  },
  kakao: {
    label: '카카오 로그인',
    className: 'bg-[#FEE500] text-[#191600] hover:brightness-95',
    mark: KakaoMark,
  },
};

/** 로그인 화면에 세우는 순서 */
export const LOGIN_PROVIDER_ORDER: OAuthProvider[] = ['kakao', 'google'];

/**
 * 우리가 아는 공급자인지 본다.
 *
 * URL 쿼리처럼 **밖에서 온 문자열**을 OAUTH_PROVIDERS 의 키로 쓰기 전에 거른다.
 * 걸르지 않으면 `?linked=nonsense` 로 `undefined.label` 을 읽어 화면이 죽는다.
 *
 * ⚠️ `in` 이 아니라 `Object.hasOwn` 을 쓴다. `in` 은 프로토타입 체인까지 보므로
 *    `'toString' in OAUTH_PROVIDERS` 가 true 가 되고, 그 뒤 `.label` 이
 *    undefined 로 새어 나온다 (테스트로 잡았다).
 */
export const isOAuthProvider = (value: unknown): value is OAuthProvider =>
  typeof value === 'string' && Object.hasOwn(OAUTH_PROVIDERS, value);
