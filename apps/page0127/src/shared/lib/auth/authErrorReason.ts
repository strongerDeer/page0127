/**
 * OAuth 콜백이 왜 실패했는지 판정한다.
 *
 * Supabase(GoTrue)와 공급자는 실패를 쿼리로 돌려보낸다:
 *   /auth/callback?error=access_denied&error_description=...
 *   /auth/callback?error=invalid_request&error_code=flow_state_expired
 *
 * 지금까지는 이 정보를 통째로 버리고 전부 "인증 오류"로 보냈다. 그래서 사용자가
 * 스스로 로그인 창을 닫아도 무언가 고장 난 것처럼 보였다.
 *
 * ⚠️ **취소와 '동의 거부'는 구분할 수 없다.** 사용자가 창을 그냥 닫은 경우와
 *    필수 동의 항목을 거부한 경우 모두 `error=access_denied` 로 온다. 구분할
 *    정보가 오지 않는데 구분하는 척하면, 창을 닫았을 뿐인 사람에게 "동의를
 *    거부하셨습니다"라고 틀린 말을 하게 된다. 그래서 하나로 합쳤다.
 *
 * 정지(ban)는 여기서 다루지 않는다 — isBannedRedirect 가 먼저 걸러 낸다.
 */

export type AuthErrorReason = 'cancelled' | 'expired' | 'unknown';

/** 시간이 지나 흐름이 끊긴 경우들. 사용자가 할 일은 "다시 시도"로 같다 */
const EXPIRED_CODES = new Set([
  'flow_state_expired',
  'flow_state_not_found',
  'otp_expired',
]);

export function toAuthErrorReason(params: URLSearchParams): AuthErrorReason {
  const code = params.get('error_code');

  // 만료를 먼저 본다 — access_denied 와 함께 실려 오는 경우가 있고,
  // 그때는 더 구체적인 쪽이 사용자에게 유용하다
  if (code && EXPIRED_CODES.has(code)) return 'expired';

  if (params.get('error') === 'access_denied') return 'cancelled';

  return 'unknown';
}
