import { MAX_PENDING_BOOKS } from './pendingShelf';
import { isSameBook } from './selection';

import type { PendingShelf } from './pendingShelf';
import type { PendingBook, PendingGoal } from './types';

/**
 * 보관분에 책 한 권을 더한다 — 남의 책 상세에서 "나도 읽었어요"를 누른 비로그인 방문자용.
 * 홈 맛보기에서 이미 고른 책·목표가 있으면 덮어쓰지 않고 뒤에 붙인다.
 * 결과는 writePendingShelf 의 입력 모양이다.
 */
export const addPendingBook = (
  current: PendingShelf | null,
  book: PendingBook
): { books: PendingBook[]; goal: PendingGoal | null } => {
  const books = current?.books ?? [];
  const goal = current?.goal ?? null;
  if (books.some((b) => isSameBook(b, book))) return { books, goal };
  if (books.length >= MAX_PENDING_BOOKS) return { books, goal };
  return { books: [...books, book], goal };
};
