/**
 * 계정 "연결" 흐름을 로그인 흐름과 구분한다.
 *
 * 둘 다 같은 OAuth 콜백(/auth/callback)으로 돌아오기 때문에, 콜백만 보고는
 * 무엇을 하려던 참인지 알 수 없다. 그래서 연결을 시작할 때 `next` 에
 * `?linked=<공급자>` 를 달아 보내고, 돌아온 콜백이 그걸 보고 판단한다.
 *
 * 왜 필요했나: 연결에 실패했는데 **"로그인하지 못했어요"** 가 떴다.
 * 사용자는 로그인이 아니라 연결을 하던 참이었고, 원인도 "알 수 없는 문제"가
 * 아니라 대개 "그 계정이 이미 다른 계정에 붙어 있음"이다. 두 번 틀린 안내였다.
 */

import { toSafeRedirect } from './safeRedirect';

/** 연결을 시작할 때 다는 표시. 성공하면 이 값으로 알림을 띄운다 */
export const LINKED_PARAM = 'linked';

/** 연결에 실패했을 때 다는 표시. 설정 화면이 이 값으로 안내를 띄운다 */
export const LINK_FAILED_PARAM = 'linkFailed';

/** 연결 화면이 있는 곳 */
const SETTINGS_PATH = '/settings';

/** 화면에 낼 수 있는 공급자. providers.tsx 를 끌어오지 않는다 —
 *  그 파일은 JSX(브랜드 마크)를 들고 있어 서버 라우트로 가져오면 무겁다 */
const LINKABLE_PROVIDERS = new Set(['kakao', 'google']);

/**
 * 실패한 콜백이 연결 흐름이었다면, 설정 화면으로 되돌릴 경로를 만든다.
 *
 * @param next 콜백이 받은 next 파라미터 (**사용자가 만들어 열 수 있는 값**)
 * @returns 연결 흐름이면 `/settings?linkFailed=<공급자>`, 아니면 null
 *          (null 이면 호출한 쪽이 일반 인증 오류 페이지로 보낸다)
 */
export function toLinkFailurePath(next: string | null): string | null {
  // 외부 URL·로그인 되돌리기 같은 것은 여기서 먼저 걸러진다
  const safe = toSafeRedirect(next);
  if (!safe) return null;

  // 상대 경로를 파싱하려면 기준이 필요하다. origin 은 쓰지 않고 버린다.
  const url = new URL(safe, 'http://internal');
  if (url.pathname !== SETTINGS_PATH) return null;

  const provider = url.searchParams.get(LINKED_PARAM);
  // 모르는 값이면 연결 흐름으로 보지 않는다 — 손으로 만든 주소일 수 있다
  if (!provider || !LINKABLE_PROVIDERS.has(provider)) return null;

  return `${SETTINGS_PATH}?${LINK_FAILED_PARAM}=${provider}`;
}
