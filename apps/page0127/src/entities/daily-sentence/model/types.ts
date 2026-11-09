/** 오늘의 문장 한 장 — 뽑은 날짜와 문장·출처 */
export type DailySentence = {
  draw_date: string;
  sentence_id: string;
  text: string;
  book_title: string;
  author: string | null;
  translator: string | null;
  page: number | null;
  isbn: string | null;
};
