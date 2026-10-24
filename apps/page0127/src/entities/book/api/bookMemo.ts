import type { Book } from '../types';

/**
 * 책 + 나만의 메모를 한 번에 읽는 select.
 *
 * 메모는 book_memos(주인만 읽는 RLS)에 있다. 로그인한 사람이 남의 책을 읽으면
 * RLS 가 행을 걸러 null 이 온다. book_memos.book_id 가 PK 라 1:1 이고,
 * 임베드 결과는 객체(또는 null)다.
 *
 * 단, book_memos 는 anon 권한이 없다. 비로그인 요청에 이 select 를 쓰면 RLS 이전에
 * permission denied 로 책 조회 자체가 실패한다 → 비로그인일 수 있는 곳은 bookSelect 를 쓴다.
 */
export const BOOK_WITH_MEMO_SELECT = '*, book_memos(memo)';

/**
 * 메모를 붙일지에 따라 select 를 고른다. 비로그인 요청이면 withMemo 를 false 로.
 * 반환 타입을 BOOK_WITH_MEMO_SELECT 로 맞추는 건 supabase 타입 추론용이다 —
 * '*' 일 때 book_memos 가 없어도 withPersonalMemo 가 null 메모로 처리한다.
 */
export const bookSelect = (withMemo: boolean) =>
  (withMemo ? BOOK_WITH_MEMO_SELECT : '*') as typeof BOOK_WITH_MEMO_SELECT;

type BookMemoEmbed = { memo: string } | { memo: string }[] | null | undefined;

/** 임베드된 book_memos 를 Book.personal_memo 로 펼친다 */
export const withPersonalMemo = (
  row: Book & { book_memos?: BookMemoEmbed }
): Book => {
  const { book_memos: embed, ...book } = row;
  const memo = Array.isArray(embed) ? embed[0]?.memo : embed?.memo;
  return { ...book, personal_memo: memo ?? null };
};
