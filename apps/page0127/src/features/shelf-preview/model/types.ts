/** POST /api/books 에 넘길 책 정보 — 로그인 너머로 들고 가는 최소 필드 */
export type PendingBook = {
  isbn: string;
  provider_item_id: string | null;
  title: string;
  author: string | null;
  publisher: string | null;
  cover_image: string | null;
  spine_image: string | null;
  pub_date: string | null;
  category: string | null;
  source: string | null;
};

export type PendingGoal = { year: number; target: number };

/** 화면에 그릴 한 권 — 저장용 정보(book)와 그리기용 주소를 함께 든다 */
export type ShelfPick = {
  book: PendingBook;
  coverSrc: string | null;
  coverFallback: string | null;
  spineSrc: string | null;
};
