/** 응원 카드를 여는 해 — 내년에 다시 하면 이 값과 문장 목록을 바꾼다 */
export const CHEER_YEAR = 2026;

/**
 * 서재 위 입구 카드를 보여 주는 기간 — 12월 한 달(서울 날짜).
 * 카드 주소(/아이디/cheer)는 기간과 상관없이 열린다: 친구가 1월에 링크를 눌러도 카드가 보여야 한다.
 *
 * @param seoulToday 'YYYY-MM-DD' (getSeoulToday)
 */
export const isCheerSeason = (seoulToday: string): boolean =>
  seoulToday >= `${CHEER_YEAR}-12-01` && seoulToday <= `${CHEER_YEAR}-12-31`;
