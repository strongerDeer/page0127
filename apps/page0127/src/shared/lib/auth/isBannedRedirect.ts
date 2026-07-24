/**
 * OAuth 콜백이 '정지(ban)'로 실패했는지 판정한다.
 *
 * Supabase(GoTrue)는 밴된 유저의 OAuth 실패를 code 없이 쿼리로 돌려보낸다:
 *   /auth/callback?error=access_denied&error_code=user_banned&error_description=User+is+banned
 * 이 경우 일반 인증 오류가 아니라 정지 안내 페이지로 보낸다.
 */
export function isBannedRedirect(params: URLSearchParams): boolean {
  return params.get('error_code') === 'user_banned';
}
