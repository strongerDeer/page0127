/**
 * 카카오 OAuth 토큰 — 저장 형태와 "언제 갱신하나" 판단. (네트워크·DB 없음, 순수 함수)
 *
 * 학습 포인트: OAuth 토큰은 두 종류다.
 * - 액세스 토큰: API 를 부를 때 쓰는 열쇠. 짧다(카카오 약 12시간).
 * - 리프레시 토큰: 새 액세스 토큰을 받는 열쇠. 길다(약 60일).
 * 카카오는 리프레시 토큰의 남은 기간이 **1달 미만일 때만** 새 리프레시 토큰을 준다.
 * 그래서 주기적으로 갱신만 해 주면(주간 크론) 리프레시 토큰이 계속 연장되어 끊기지 않는다.
 */

/** DB(alert_channel_tokens)에 저장하는 형태. 만료는 "남은 초"가 아니라 시각으로 둔다 */
export type StoredKakaoTokens = {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

/** 카카오 토큰 발급·갱신 응답 (https://kauth.kakao.com/oauth/token) */
export type KakaoTokenResponse = {
  access_token: string;
  expires_in: number;
  /** 갱신 응답에서는 남은 기간이 1달 미만일 때만 온다 */
  refresh_token?: string;
  refresh_token_expires_in?: number;
};

/** 만료 직전에 보내다 실패하지 않게, 이만큼 남으면 미리 갱신한다 */
const ACCESS_TOKEN_MARGIN_MS = 10 * 60 * 1000;

/**
 * 응답을 저장 형태로 바꾼다.
 *
 * 갱신 응답에 refresh_token 이 없으면 **기존 것을 그대로 유지**한다. 여기서 비워 버리면
 * 다음 갱신 때 쓸 열쇠가 사라져 운영자가 다시 연결해야 한다.
 */
export const toStoredTokens = (
  response: KakaoTokenResponse,
  now: Date,
  previous?: StoredKakaoTokens
): StoredKakaoTokens => {
  const after = (seconds: number) => new Date(now.getTime() + seconds * 1000);

  if (response.refresh_token && response.refresh_token_expires_in) {
    return {
      accessToken: response.access_token,
      accessTokenExpiresAt: after(response.expires_in),
      refreshToken: response.refresh_token,
      refreshTokenExpiresAt: after(response.refresh_token_expires_in),
    };
  }

  if (!previous) {
    // 최초 발급(인가 코드 교환)인데 리프레시 토큰이 없다면 연결 자체가 잘못된 것이다
    throw new Error('카카오 응답에 refresh_token 이 없습니다 — 다시 연결해야 합니다.');
  }

  return {
    ...previous,
    accessToken: response.access_token,
    accessTokenExpiresAt: after(response.expires_in),
  };
};

/** 액세스 토큰을 지금 갱신해야 하는가 (만료됐거나 10분 안에 만료) */
export const needsAccessRefresh = (tokens: StoredKakaoTokens, now: Date): boolean =>
  tokens.accessTokenExpiresAt.getTime() - now.getTime() <= ACCESS_TOKEN_MARGIN_MS;

/** 리프레시 토큰까지 만료됐는가 — 그러면 갱신도 못 하고 어드민에서 다시 연결해야 한다 */
export const isRefreshTokenExpired = (tokens: StoredKakaoTokens, now: Date): boolean =>
  tokens.refreshTokenExpiresAt.getTime() <= now.getTime();
