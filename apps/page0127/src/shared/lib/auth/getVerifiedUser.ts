import {
  isAuthApiError,
  isAuthError,
  isAuthSessionMissingError,
} from '@supabase/supabase-js';

import type {
  AuthError,
  JwtPayload,
  User,
  UserResponse,
} from '@supabase/supabase-js';

/**
 * 화면·API 가 "지금 누가 로그인했나"를 알 때 쓰는 최소 사용자 정보.
 *
 * Supabase 의 `User` 전체(identities·created_at 등)는 Auth 서버에 물어봐야 얻는다.
 * 우리 코드가 실제로 쓰는 건 id·email·user_metadata 정도라, JWT claims 만으로 채울 수 있는
 * 이 모양으로 좁힌다. 그래야 `getClaims()`(로컬 검증)로 바꿔도 호출부가 그대로 동작한다.
 */
export type AuthUser = Pick<
  User,
  'id' | 'email' | 'user_metadata' | 'app_metadata'
>;

/** A failed verification is not evidence of logout. Never trust an unverified session. */
const isDefiniteRejection = (error: AuthError): boolean => {
  if (isAuthSessionMissingError(error)) return true;
  // Invalid/revoked credentials are a genuine anonymous state; service failures,
  // timeouts and rate limits must remain errors so callers can retry safely.
  return (
    isAuthApiError(error) &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  );
};

/**
 * Auth 서버에 직접 물어 검증한다(매번 네트워크 왕복).
 *
 * 정지(ban)·탈퇴처럼 "토큰은 아직 살아 있지만 계정 상태가 바뀐" 경우를 즉시 반영해야 하는
 * 경계(관리자 확인 등)에서만 쓴다. 일반 화면은 아래 getVerifiedClaimsUser 를 쓴다.
 */
export async function getVerifiedUser(auth: {
  getUser(): Promise<UserResponse>;
}): Promise<User | null> {
  const { data, error } = await auth.getUser();
  if (!error) return data.user;
  if (isDefiniteRejection(error)) return null;
  throw error;
}

type ClaimsResponse =
  | { data: { claims: JwtPayload } | null; error: null }
  | { data: null; error: AuthError };

/**
 * JWT 서명을 검증해 사용자를 얻는다 — 비대칭 서명키(ES256/RS256)면 서버 안에서 끝난다.
 *
 * 왜 getUser 대신 쓰나: 로그인한 사람의 페이지 요청마다 proxy 와 레이아웃이 각각
 * Auth 서버를 다녀와, 첫 바이트(TTFB) 전에 왕복이 줄지어 있었다(2026-11-09).
 * getClaims 는 공개키(JWKS, 한 번 받아 캐시)로 서명만 확인해서 왕복이 없다.
 *
 * 알아둘 차이:
 * - 프로젝트가 아직 Legacy HS256 비밀키면 getClaims 가 내부에서 getUser 를 불러 지금과 같다.
 * - 로컬 검증은 토큰 만료(jwt_expiry, 1시간)까지 유효하다. 정지된 사람도 그 사이엔 화면이 열린다.
 *   (DB 의 RLS 도 원래 토큰 서명만 보므로 데이터 접근 경계는 달라지지 않는다.)
 *   즉시 막아야 하는 곳은 getVerifiedUser 를 쓴다.
 * - 만료가 가까우면 getSession 이 먼저 갱신한다 → proxy 의 쿠키 재발급 흐름은 그대로다.
 */
export async function getVerifiedClaimsUser(auth: {
  getClaims(): Promise<ClaimsResponse>;
}): Promise<AuthUser | null> {
  const { data, error } = await auth.getClaims();

  if (error) {
    // 서명이 틀렸거나 만료된 토큰은 "로그인 안 됨"이 맞다(서버 장애가 아니다)
    if (isAuthError(error) && error.name === 'AuthInvalidJwtError') return null;
    if (isDefiniteRejection(error)) return null;
    throw error;
  }
  // 세션 자체가 없으면 data 가 null 이다(네트워크 요청 없이 끝난다)
  if (!data) return null;

  const { claims } = data;
  return {
    id: claims.sub,
    email: claims.email,
    user_metadata: claims.user_metadata ?? {},
    app_metadata: claims.app_metadata ?? {},
  };
}
