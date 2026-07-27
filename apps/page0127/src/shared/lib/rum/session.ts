// 익명 세션 id.
//
// 로그인 사용자 id를 쓰지 않는 이유: 그러면 "누가 느린 기기를 쓰는지"를 알 수 있게 되고,
// 그건 개인별 성능 프로파일이다. 개인정보처리방침에 없는 수집이라 하지 않는다.
// 여기서 필요한 건 "한 방문에서 나온 여러 지표를 묶는 것"뿐이라 난수로 충분하다.
//
// sessionStorage를 쓰는 이유: 탭을 닫으면 사라진다(방문 단위 수명). localStorage로
// 두면 사실상 영구 식별자가 되어 위 원칙이 깨진다.

const STORAGE_KEY = 'rum-session-id';

const randomId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * 이 방문의 세션 id. sessionStorage가 막혀 있어도(프라이빗 모드·차단 설정) 던지지 않고
 * 일회용 id로 물러난다 — 성능 수집이 페이지를 깨뜨리면 안 된다.
 */
export const getRumSessionId = (): string => {
  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const created = randomId();
    sessionStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return randomId();
  }
};
