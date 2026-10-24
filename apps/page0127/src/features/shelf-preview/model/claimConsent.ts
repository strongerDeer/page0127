/**
 * 고른 뒤 이 시간 안에 로그인 버튼을 눌렀으면 "고른 사람 = 로그인한 사람"으로 본다.
 * 저장하기 → 로그인 화면 → 버튼까지는 보통 1분도 안 걸린다. 넉넉히 30분.
 */
export const AUTO_CLAIM_WINDOW_MS = 30 * 60 * 1000;

/** 기기 시계가 조금 어긋나도(서버 시각 아님) 바로 이어진 흐름을 놓치지 않게 */
const CLOCK_SKEW_MS = 60 * 1000;

/**
 * 맛보기 보관분을 묻지 않고 담아도 되는지.
 *
 * 보관분(localStorage, 24시간)은 계정과 묶여 있지 않다. 공용 PC 에서 앞사람이 고르고
 * 로그인하지 않은 채 떠나면, 다음에 로그인한 사람 서재에 그 책이 담긴다.
 * 그래서 "이 탭에서, 고른 직후에 로그인을 시작했을 때"만 바로 담고 나머지는 확인받는다.
 *
 * @param savedAt 보관분을 고른 시각
 * @param loginStartedAt 이 탭에서 로그인 버튼을 누른 시각(sessionStorage). 없으면 null
 */
export const canAutoClaim = (
  savedAt: number,
  loginStartedAt: number | null
): boolean =>
  loginStartedAt !== null &&
  loginStartedAt >= savedAt - CLOCK_SKEW_MS &&
  loginStartedAt - savedAt <= AUTO_CLAIM_WINDOW_MS;
