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

import { toSafeRedirect } from '@/shared/lib/auth/safeRedirect';

export const SIGNUP_WELCOME_PARAM = 'welcome';

/** 주소에 그대로 실리는 값이라 짧은 소문자만 받는다. 그 밖은 'other' 로 뭉갠다 */
const PROVIDER_PATTERN = /^[a-z]{1,20}$/;

const toMethod = (provider: string | null | undefined): string =>
  provider && PROVIDER_PATTERN.test(provider) ? provider : 'other';

/** 온보딩 완료 후 이동할 주소. 예: `/bookworm?welcome=kakao` */
export const toWelcomePath = (
  username: string,
  provider: string | null | undefined,
  next?: string | null
): string => {
  const url = new URL(
    toSafeRedirect(next) ?? `/${username}`,
    'https://internal.invalid'
  );
  url.searchParams.set(SIGNUP_WELCOME_PARAM, toMethod(provider));
  return `${url.pathname}${url.search}${url.hash}`;
};

/** 가입 직후 "읽은 책 고르기" 화면. 빈 서재로 바로 보내지 않고 한 번 거친다 */
export const FIRST_BOOKS_PATH = '/onboarding/books';

/**
 * 온보딩을 마친 뒤 이동할 주소.
 *
 * - 가려던 곳(next)이 있으면 그대로 간다 — 책 상세·케미처럼 맥락을 들고 온 사람이다.
 * - 없으면 빈 서재 대신 책 고르기 화면으로 간다. 2026-10-30~11-01 가입자 대부분이
 *   빈 서재에 도착한 뒤 도서 추가를 한 번도 열지 않았다.
 *   가입 표시(welcome)는 고르기 화면이 받아 sign_up 을 보낸다.
 */
export const toPostOnboardingPath = (
  username: string,
  provider: string | null | undefined,
  next?: string | null
): string =>
  toSafeRedirect(next)
    ? toWelcomePath(username, provider, next)
    : `${FIRST_BOOKS_PATH}?${SIGNUP_WELCOME_PARAM}=${toMethod(provider)}`;

/**
 * 도착한 주소에서 가입 공급자를 읽는다.
 * @returns 표시가 없으면 null — 이때는 아무것도 보내지 않는다
 */
export const readSignupMethod = (value: string | null): string | null =>
  value === null ? null : toMethod(value);
