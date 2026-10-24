import type { Book } from '../types';

/**
 * 책 + 나만의 메모를 한 번에 읽는 select.
 *
 * 메모는 book_memos(주인만 읽는 RLS)에 있다. PostgREST 임베드로 붙이면 남의 책에서는
 * RLS 가 행을 걸러 null 이 오므로, 주인 여부를 몰라도 같은 select 를 써도 안전하다.
 * book_memos.book_id 가 PK 라 1:1 이고, 임베드 결과는 객체(또는 null)다.
 */
export const BOOK_WITH_MEMO_SELECT = '*, book_memos(memo)';

type BookMemoEmbed = { memo: string } | { memo: string }[] | null | undefined;

/** 임베드된 book_memos 를 Book.personal_memo 로 펼친다 */
export const withPersonalMemo = (
  row: Book & { book_memos?: BookMemoEmbed }
): Book => {
  const { book_memos: embed, ...book } = row;
  const memo = Array.isArray(embed) ? embed[0]?.memo : embed?.memo;
  return { ...book, personal_memo: memo ?? null };
};
