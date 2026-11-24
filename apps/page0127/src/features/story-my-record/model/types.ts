/** GET /api/books/this-year 응답 — 올해 내 완독 수와 목표 */
export type ThisYearRecord = {
  year: number;
  completed: number;
  /** 올해 목표. 정하지 않았으면 null */
  goal: number | null;
};
