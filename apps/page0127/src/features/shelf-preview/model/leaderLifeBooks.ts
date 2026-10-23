import { toRenderableSrc } from '@/shared/lib/imageHost';

import { toCoverSource } from '@/entities/book';

/** 히어로 B 에 보여줄 "리더들이 뽑은 인생책" 한 권 — 보여주기만 한다(누르는 대상이 아니다) */
export type LeaderLifeBook = {
  isbn: string;
  title: string;
  coverSrc: string | null;
  coverFallback: string | null;
};

/** 랭킹 RPC 의 book_info 에서 쓰는 열만 */
export type LeaderLifeBookRow = {
  isbn: string;
  book_info: {
    title: string;
    cover_image: string | null;
    provider_item_id: string | null;
  };
};

export const LEADER_LIFE_BOOKS_LIMIT = 5;

/**
 * 이보다 적으면 줄을 숨긴다. 한두 권만 덩그러니 있으면 "리더들이 뽑았다"는 말이 무색하고,
 * 운영자가 고른 책으로 채우면 사실과 달라진다.
 */
export const LEADER_LIFE_BOOKS_MIN = 3;

/**
 * 랭킹 행 → 화면에 그릴 표지. 표지 주소는 맛보기 10권과 같은 규칙(YES24 먼저, 그릴 수 있는 호스트만).
 * 표지가 없는 책은 뺀다 — 이 줄은 표지만 보여 준다.
 */
export const toLeaderLifeBooks = (
  rows: LeaderLifeBookRow[],
  storageOrigin: string
): LeaderLifeBook[] => {
  const books = rows
    .map((row) => {
      const cover = toCoverSource({
        cover_image: toRenderableSrc(row.book_info.cover_image, storageOrigin),
        provider_item_id: row.book_info.provider_item_id,
      });
      return {
        isbn: row.isbn,
        title: row.book_info.title,
        coverSrc: cover.src,
        coverFallback: cover.fallbackSrc,
      };
    })
    .filter((b) => b.coverSrc !== null)
    .slice(0, LEADER_LIFE_BOOKS_LIMIT);

  return books.length >= LEADER_LIFE_BOOKS_MIN ? books : [];
};
