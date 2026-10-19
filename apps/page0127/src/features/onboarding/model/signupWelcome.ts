/**
 * 가입 완료를 GA4 로 알리기 위한 주소 표시.
 *
 * GA4 에는 `signup_start`(버튼 클릭)만 있고 **가입을 끝냈는지**는 없었다.
 * 가입 완료 지점(온보딩 완료)은 서버 액션이라 그 자리에서 gtag 를 부를 수 없다.
 * 그래서 서버가 이동할 주소에 표시를 붙이고, 도착한 화면이 그걸 보고 한 번 보낸다.
 *
 * 표시값은 로그인 공급자(google·kakao)다 — 카카오 가입이 구글과 다른 길을 타므로
 * GA4 에서 공급자별 가입 수를 나눠 볼 수 있게 한다.
 */

export const SIGNUP_WELCOME_PARAM = 'welcome';

/** 주소에 그대로 실리는 값이라 짧은 소문자만 받는다. 그 밖은 'other' 로 뭉갠다 */
const PROVIDER_PATTERN = /^[a-z]{1,20}$/;

const toMethod = (provider: string | null | undefined): string =>
  provider && PROVIDER_PATTERN.test(provider) ? provider : 'other';

/** 온보딩 완료 후 이동할 주소. 예: `/bookworm?welcome=kakao` */
export const toWelcomePath = (
  username: string,
  provider: string | null | undefined
): string =>
  `/${username}?${SIGNUP_WELCOME_PARAM}=${encodeURIComponent(toMethod(provider))}`;

/**
 * 도착한 주소에서 가입 공급자를 읽는다.
 * @returns 표시가 없으면 null — 이때는 아무것도 보내지 않는다
 */
export const readSignupMethod = (value: string | null): string | null =>
  value === null ? null : toMethod(value);
