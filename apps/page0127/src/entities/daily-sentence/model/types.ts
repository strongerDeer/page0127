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
  /** 어드민에서 책을 고를 때 받아 둔 서점 표지(https). 없으면 제목을 조판한다 */
  cover_image: string | null;
};
