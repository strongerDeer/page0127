import type { PendingBook, ShelfPick } from './types';

/**
 * 같은 책인가 — GET /api/books 의 중복 검사와 같은 규칙(isbn 또는 상품번호).
 *
 * isbn 만 보면 안 된다: 맛보기 10권의 키는 ISBN10·K코드가 섞여 있고 검색 결과는 ISBN13 이라,
 * 목록에서 고른 책을 검색에서 또 고르면 두 권으로 꽂힌다.
 */
export const isSameBook = (a: PendingBook, b: PendingBook): boolean =>
  a.isbn === b.isbn ||
  (a.provider_item_id !== null && a.provider_item_id === b.provider_item_id);

/** 같은 책이 있으면 빼고, 없으면 상한 안에서 뒤에 붙인다 */
export const toggleSelection = (
  list: ShelfPick[],
  pick: ShelfPick,
  max: number
): ShelfPick[] => {
  if (list.some((p) => isSameBook(p.book, pick.book))) {
    return list.filter((p) => !isSameBook(p.book, pick.book));
  }
  if (list.length >= max) return list;
  return [...list, pick];
};
