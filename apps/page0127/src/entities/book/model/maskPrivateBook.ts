import type { Book } from '../types';

/** 방문자에게 내려도 되는 비공개 책의 칸 — 언제 다 읽었는지·몇 번째 읽었는지만 */
export type PrivateBookRow = Pick<
  Book,
  | 'isbn'
  | 'status'
  | 'read_count'
  | 'completed_date'
  | 'completed_year'
  | 'created_at'
>;

export const PRIVATE_BOOK_TITLE = '비공개 도서';

/**
 * 비공개 책을 방문자용 "북커버 씌운 책"으로 바꾼다.
 *
 * 왜: 방문자 책장에서 비공개 책을 통째로 빼면 주인은 1권, 방문자는 0권으로 숫자가
 * 어긋난다(HJ, 2026-11-04). 방문자에게도 "여기 책이 한 권 꽂혀 있다"는 사실과
 * 완독 수는 보여 주고, 무슨 책인지는 숨긴다.
 *
 * - id·isbn 은 진짜 값을 쓰지 않는다. 상세 주소나 ISBN 으로 책을 알아낼 수 없게
 *   순번으로 바꾼다. 같은 ISBN 은 같은 순번을 받아 재독 합치기(dedupeReadings)는 그대로 된다.
 * - 제목·표지·분야·별점·감상은 전부 비운다. 별점을 남기면 5점 책은 표지로 크게
 *   서서 "아끼는 책"이라는 것까지 드러나므로 책등으로만 세운다.
 */
export const maskPrivateBooks = (
  rows: PrivateBookRow[],
  userId: string
): Book[] => {
  const isbnKeys = new Map<string, number>();

  return rows.map((row, index) => {
    const isbnKey = isbnKeys.get(row.isbn) ?? isbnKeys.size;
    isbnKeys.set(row.isbn, isbnKey);

    return {
      id: `private-${index}`,
      user_id: userId,
      isbn: `private-${isbnKey}`,
      title: PRIVATE_BOOK_TITLE,
      sub_title: null,
      source: null,
      provider_item_id: null,
      thickness_mm: null,
      author: null,
      publisher: null,
      cover_image: null,
      spine_image: null,
      description: null,
      pub_date: null,
      category: null,
      page_count: null,
      toc: null,
      status: row.status,
      read_count: row.read_count,
      start_date: null,
      completed_date: row.completed_date,
      completed_year: row.completed_year,
      rating: null,
      is_life_book: false,
      one_line_review: null,
      personal_memo: null,
      tags: null,
      is_public: false,
      is_masked: true,
      created_at: row.created_at,
      updated_at: row.created_at,
    };
  });
};

/** 공개 책 목록과 합친 뒤 서버 조회와 같은 순서(완독일 최신순, 날짜 모르는 책 먼저)로 세운다 */
export const mergeByCompletedDate = (books: Book[], masked: Book[]): Book[] => {
  if (masked.length === 0) return books;
  const key = (book: Book) => book.completed_date ?? '￿';
  return [...books, ...masked].sort((a, b) => key(b).localeCompare(key(a)));
};
