/**
 * 연결 결과를 화면에 뭐라고 알릴지 정한다.
 *
 * 연결은 공급자 페이지를 왕복하므로, 시작한 훅 안에서는 결과를 알 수 없다.
 * 돌아온 주소의 `?linked=`(성공)·`?linkFailed=`(실패)를 보고 판단한다.
 *
 * 판단만 여기 두고 toast 호출은 화면이 한다 — 그래야 테스트할 수 있다.
 */

import { isOAuthProvider, OAUTH_PROVIDERS } from './providers';

export type LinkResultMessage = {
  kind: 'success' | 'error';
  text: string;
};

type LinkResultInput = {
  /** ?linked= 값 (성공). **사용자가 손으로 바꿀 수 있다** */
  linked: string | null;
  /** ?linkFailed= 값 (실패). 마찬가지로 신뢰하지 않는다 */
  failed: string | null;
};

/**
 * @returns 알릴 내용, 알릴 것이 없으면 null
 */
export function toLinkResultMessage({
  linked,
  failed,
}: LinkResultInput): LinkResultMessage | null {
  // 둘 다 실려 오면 성공을 택한다 — 연결됐는데 실패했다고 뜨는 쪽이 더 나쁘다
  const provider = linked ?? failed;
  if (!isOAuthProvider(provider)) return null;

  const { label } = OAUTH_PROVIDERS[provider];

  if (linked) {
    return { kind: 'success', text: `${label} 계정을 연결했어요.` };
  }

  // 원인을 단정하지 않는다 — 서버가 사유를 돌려주지 않는다(로그에도 안 남았다).
  // 다만 SDK 문서상으로도 실측으로도 압도적으로 흔한 원인은 "그 계정이 이미
  // 다른 계정에 붙어 있음"이라, 거기서 빠져나갈 길을 함께 준다.
  return {
    kind: 'error',
    text: `${label} 계정을 연결하지 못했어요. 이미 다른 계정에서 쓰고 있는 계정이라면, 그 계정으로 로그인해 연결을 끊은 뒤 다시 시도해 주세요.`,
  };
}
