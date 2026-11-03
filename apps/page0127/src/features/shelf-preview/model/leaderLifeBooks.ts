import { fromGlobalBookRow } from './toShelfPick';

import type { ShelfPick } from './types';

/**
 * 히어로 B 에 보여줄 "리더들이 뽑은 인생책" 한 권.
 * 누르면 검색으로 고른 것처럼 위 빈 카드에 꽂힌다 → 저장용 정보(book)까지 든 ShelfPick 그대로 쓴다.
 */
export type LeaderLifeBook = ShelfPick;

/**
 * 랭킹 RPC 의 book_info 에서 쓰는 열만.
 * book_info 는 to_jsonb(global_books.*) 라 PendingBook 에 필요한 열이 다 있다.
 * 예전 캐시·이상한 행에도 버티도록 제목·isbn 외에는 없을 수 있다고 본다.
 */
export type LeaderLifeBookRow = {
  isbn: string;
  book_info: {
    title: string;
    cover_image: string | null;
    provider_item_id: string | null;
    author?: string | null;
    publisher?: string | null;
    spine_image?: string | null;
    pub_date?: string | null;
    category?: string | null;
    source?: string | null;
  };
};

export const LEADER_LIFE_BOOKS_LIMIT = 5;

/**
 * 이보다 적으면 줄을 숨긴다. 한두 권만 덩그러니 있으면 "리더들이 뽑았다"는 말이 무색하고,
 * 운영자가 고른 책으로 채우면 사실과 달라진다.
 */
export const LEADER_LIFE_BOOKS_MIN = 3;

/**
 * 랭킹 행 → 화면에 그릴 표지 + 저장할 책 정보. 맛보기 10권과 같은 규칙(fromGlobalBookRow):
 * 화면은 YES24 먼저·그릴 수 있는 호스트만, 저장은 DB 원본 그대로.
 * 표지가 없는 책은 뺀다 — 이 줄은 표지만 보여 준다.
 */
export const toLeaderLifeBooks = (
  rows: LeaderLifeBookRow[],
  storageOrigin: string
): LeaderLifeBook[] => {
  const books = rows
    .map(({ isbn, book_info: b }) =>
      fromGlobalBookRow(
        {
          isbn,
          provider_item_id: b.provider_item_id,
          title: b.title,
          author: b.author ?? null,
          publisher: b.publisher ?? null,
          cover_image: b.cover_image,
          spine_image: b.spine_image ?? null,
          pub_date: b.pub_date ?? null,
          category: b.category ?? null,
          source: b.source ?? null,
        },
        storageOrigin
      )
    )
    .filter((b) => b.coverSrc !== null)
    .slice(0, LEADER_LIFE_BOOKS_LIMIT);

  return books.length >= LEADER_LIFE_BOOKS_MIN ? books : [];
};
