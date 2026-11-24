/** GET /api/books/this-year 응답 — 올해 내 완독 수와 목표 */
export type ThisYearRecord = {
  year: number;
  completed: number;
  /** 올해 목표. 정하지 않았으면 null */
  goal: number | null;
  /** 내 서재 주소(/아이디). 온보딩 전이라 아이디가 없으면 null → 버튼을 두지 않는다 */
  username: string | null;
};
