/**
 * 이 탭에서 소셜 로그인 버튼을 누른 시각.
 *
 * 학습 포인트:
 * - 왜 sessionStorage 인가: 탭 하나에만 있고 탭·브라우저를 닫으면 사라진다.
 *   OAuth 는 같은 탭에서 나갔다 돌아오므로 남아 있지만, 공용 PC 에서 앞사람이
 *   창을 닫고 떠났다면 다음 사람에게는 없다.
 * - 로그인 후 무언가를 "이어서" 할 때 정말 방금 이 탭에서 시작한 로그인인지 가르는 데 쓴다.
 * - 사파리 비공개 모드 등에서는 접근 자체가 던진다 → 모든 접근을 try/catch 로 감싼다.
 */

export const LOGIN_START_KEY = 'page0127:login-started-at';

export const markLoginStart = (now = Date.now()): void => {
  try {
    sessionStorage.setItem(LOGIN_START_KEY, String(now));
  } catch {
    // 못 남기면 로그인 뒤에 한 번 더 확인받을 뿐이다
  }
};

export const readLoginStart = (): number | null => {
  try {
    const value = Number(sessionStorage.getItem(LOGIN_START_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

export const clearLoginStart = (): void => {
  try {
    sessionStorage.removeItem(LOGIN_START_KEY);
  } catch {
    // 저장소에 못 닿으면 지울 것도 없다
  }
};
