import { MAX_PENDING_BOOKS } from './pendingShelf';
import { isSameBook } from './selection';

import type { PendingShelf, PendingShelfInput } from './pendingShelf';
import type { PendingBook } from './types';

/**
 * 히어로 B("당신의 인생책은?")에서 찾은 한 권을 보관분의 인생책으로 둔다.
 * 결과는 writePendingShelf 의 입력 모양이다.
 *
 * - 인생책은 맨 앞에 둔다 — 서재에 담을 때 가장 먼저 꽂힌다.
 * - 책 상세 "나도 읽었어요"로 이미 담아 둔 책·목표는 그대로 둔다.
 * - 전에 고른 인생책이 있으면 뺀다 — 다시 찾았다는 건 마음을 바꿨다는 뜻이라 "읽은 책"으로
 *   남기지 않는다.
 */
export const withLifeBook = (
  current: PendingShelf | null,
  book: PendingBook
): PendingShelfInput => {
  const previousLife = current?.lifeBookIsbn;
  const others = (current?.books ?? []).filter(
    (b) => !isSameBook(b, book) && b.isbn !== previousLife
  );
  return {
    books: [book, ...others].slice(0, MAX_PENDING_BOOKS),
    goal: current?.goal ?? null,
    lifeBookIsbn: book.isbn,
  };
};
