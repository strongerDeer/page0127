import { toSafeRedirect } from './safeRedirect';

/**
 * 로그인 직후 어디로 보낼지 정한다.
 *
 * 콜백 라우트에 흩어져 있던 판단을 한 곳에 모은다 — 라우트는 I/O 만 하고,
 * "어디로 갈지"는 순수 함수로 두어 테스트한다.
 */

export const ONBOARDING_PATH = '/onboarding';

type PostLoginInput = {
  /** profiles.username. 아직 없을 수 있다 */
  username: string | null;
  /** profiles.onboarded_at. NULL 이면 온보딩 미완료 */
  onboardedAt: string | null;
  /** 로그인 전에 가려던 내부 경로 (사용자가 조작할 수 있는 값) */
  next: string | null;
};

/**
 * @returns 이동할 내부 경로
 */
export function toPostLoginPath({
  username,
  onboardedAt,
  next,
}: PostLoginInput): string {
  // 온보딩이 먼저다. next 가 있어도 미룬다 —
  // 아이디가 정해지기 전에 서재로 보내면 자동 생성된 주소가 그대로 굳는다.
  //
  // username 이 없을 때도 여기로 보낸다. 아이디 없이 `/${username}` 을 만들면
  // `/` 로 튕겨 사용자는 로그인이 실패한 것처럼 느낀다.
  if (!onboardedAt || !username) return ONBOARDING_PATH;

  // next 는 사용자가 만들어 열 수 있다 — 외부 URL 이면 버린다
  return toSafeRedirect(next) ?? `/${username}`;
}
