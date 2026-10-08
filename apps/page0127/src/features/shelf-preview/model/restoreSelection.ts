import { toRenderableSrc } from '@/shared/lib/imageHost';

import { isSameBook } from './selection';

import type { PendingBook, ShelfPick } from './types';

/**
 * 다시 온 방문자의 책장을 되살린다 — 고르고 로그인하지 않은 채 떠났다면
 * 다시 왔을 때 처음부터 고르게 하지 않는다.
 *
 * - 목록에 있는 책: 목록의 그리기 주소(YES24 먼저, Storage 대체)를 쓴다.
 * - 검색으로 고른 책: 보관된 주소 중 그릴 수 있는 호스트만 쓴다. 보관분은 사용자가
 *   조작할 수 있는 값이라, 허용되지 않은 호스트가 next/image 에 닿으면 화면이 터진다.
 */
export const restoreSelection = (
  saved: PendingBook[],
  picks: ShelfPick[],
  storageOrigin: string
): ShelfPick[] => {
  const restored: ShelfPick[] = [];
  for (const book of saved) {
    if (restored.some((p) => isSameBook(p.book, book))) continue;
    const listed = picks.find((p) => isSameBook(p.book, book));
    restored.push(
      listed ?? {
        book,
        coverSrc: toRenderableSrc(book.cover_image, storageOrigin),
        coverFallback: null,
        spineSrc: toRenderableSrc(book.spine_image, storageOrigin),
      }
    );
  }
  return restored;
};
