/** connect 가 심고 callback 이 확인하는 state 쿠키 이름 */
export const KAKAO_ALERT_STATE_COOKIE = 'kakao_alert_state';

/** 어드민 에러 화면 — 연결 결과를 쿼리로 붙여 돌려보낸다 */
export const KAKAO_ALERT_RETURN_PATH = '/admin/errors';

/**
 * 어드민 에러 화면으로 돌아갈 주소. 결과·사유를 쿼리로 붙인다.
 *
 * missing — 빠진 환경변수 **이름**만 담는다(값은 절대 담지 않는다). 어드민만 보는 화면이고,
 * 이름은 .env.example 에도 공개돼 있다.
 */
export const kakaoAlertReturnUrl = (
  origin: string,
  result: 'connected' | 'error',
  reason?: string,
  missing?: string[]
): URL => {
  const url = new URL(KAKAO_ALERT_RETURN_PATH, origin);
  url.searchParams.set('kakao', result);
  if (reason) url.searchParams.set('reason', reason);
  if (missing?.length) url.searchParams.set('missing', missing.join(','));
  return url;
};
