/**
 * 연결된 소셜 계정 판정 — 화면과 떨어뜨려 테스트할 수 있게 순수 함수로 둔다.
 *
 * 왜 필요한가: 카카오는 이메일을 필수로 받으므로 대개 Supabase 가 같은 이메일의
 * 기존 계정에 identity 를 자동으로 붙여 준다. 하지만 **구글과 카카오에 서로 다른
 * 이메일을 쓴 사람**은 자동 연결이 걸리지 않아 계정이 둘로 갈라진다.
 * 그 사람이 직접 합칠 수 있게 하는 것이 이 기능이다.
 */

import { LOGIN_PROVIDER_ORDER, type OAuthProvider } from './providers';

/** Supabase 의 UserIdentity 중 우리가 판정에 쓰는 부분만 */
type IdentityLike = { provider: string };

export type LinkedAccountRow = {
  provider: OAuthProvider;
  isLinked: boolean;
  canUnlink: boolean;
};

/**
 * 마지막 하나는 끊을 수 없다는 안내.
 *
 * 버튼만 비활성으로 두면 사용자는 고장으로 읽는다 — 왜 못 하는지 같이 말한다.
 */
export const UNLINK_BLOCKED_MESSAGE =
  '마지막 하나는 연결을 끊을 수 없어요. 다른 계정을 먼저 연결해 주세요. 끊으면 로그인할 방법이 사라집니다.';

/**
 * 연결을 하나라도 끊어도 되는 상태인가.
 *
 * ⚠️ 우리가 화면에 보여 주지 않는 identity(email·phone 등)도 **로그인 수단이므로
 *    같이 센다.** 화면에 안 보인다고 없는 게 아니다.
 */
export const canUnlink = (identities: IdentityLike[]): boolean =>
  identities.length > 1;

/**
 * 화면에 뿌릴 행 목록을 만든다.
 *
 * 연결 안 된 공급자도 행으로 낸다 — 그래야 사용자가 연결할 수 있다.
 * 순서는 로그인 화면과 같게 유지한다(`LOGIN_PROVIDER_ORDER`). 같은 것을 두 곳에서
 * 다른 순서로 보여 주면 사용자는 다른 목록이라고 느낀다.
 */
export const toLinkedAccountRows = (
  identities: IdentityLike[]
): LinkedAccountRow[] => {
  const linked = new Set(identities.map((i) => i.provider));
  const unlinkable = canUnlink(identities);

  return LOGIN_PROVIDER_ORDER.map((provider) => {
    const isLinked = linked.has(provider);
    return {
      provider,
      isLinked,
      // 연결돼 있지 않으면 끊을 것도 없다
      canUnlink: isLinked && unlinkable,
    };
  });
};
