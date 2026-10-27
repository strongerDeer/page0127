import { MAX_PENDING_BOOKS } from './pendingShelf';
import { isSameBook } from './selection';

import type { PendingShelf, PendingShelfInput } from './pendingShelf';
import type { PendingBook } from './types';

/**
 * 보관분에 책 한 권을 더한다 — 남의 책 상세에서 "나도 읽었어요"를 누른 비로그인 방문자용.
 * 홈 맛보기에서 이미 고른 책·목표·인생책이 있으면 덮어쓰지 않고 뒤에 붙인다.
 * 결과는 writePendingShelf 의 입력 모양이다.
 */
export const addPendingBook = (
  current: PendingShelf | null,
  book: PendingBook
): PendingShelfInput => {
  const books = current?.books ?? [];
  const goal = current?.goal ?? null;
  // 히어로 B 에서 찾은 인생책 표시를 잃지 않게 그대로 넘긴다
  const life = current?.lifeBookIsbn
    ? { lifeBookIsbn: current.lifeBookIsbn }
    : {};
  if (books.some((b) => isSameBook(b, book)))
    return {
      books:
        book.status === 'completed'
          ? books.map((b) =>
              isSameBook(b, book)
                ? {
                    ...b,
                    status: 'completed',
                    ...(book.completion ? { completion: book.completion } : {}),
                  }
                : b
            )
          : books,
      goal,
      ...life,
    };
  if (books.length >= MAX_PENDING_BOOKS) return { books, goal, ...life };
  return { books: [...books, book], goal, ...life };
};
