/** 책 상세 "간직한 문장" 한 줄 — book_quotes 행에서 화면에 필요한 칸만 */
export type BookQuote = {
  id: string;
  isbn: string;
  text: string;
  page: number | null;
  created_at: string;
};

/** 서재(프로필)에 띄우는 무작위 문장 — 책 기록을 모두 지웠으면 book_id·title 이 없다 */
export type RandomQuote = {
  id: string;
  isbn: string;
  text: string;
  page: number | null;
  book_id: string | null;
  title: string | null;
};
