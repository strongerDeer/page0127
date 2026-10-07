import { toRenderableSrc } from '@/shared/lib/imageHost';

import { toCoverSource } from '@/entities/book';

export type TopBook = {
  isbn: string;
  title: string;
  cover: string | null;
  /** cover(YES24)를 못 불러왔을 때 쓸 Storage 사본 */
  coverFallback: string | null;
  count: number;
};

/** get_most_read_books RPC 의 행 — count 는 bigint 라 문자열로 올 수 있다 */
export type TopBookRow = {
  isbn: string;
  count: number | string;
  book_info: {
    title?: string;
    cover_image?: string | null;
    provider_item_id?: string | null;
  } | null;
};

/** 랭킹 행을 카드에 쓸 모양으로 바꾼다. 제목 없는 행은 빼고, 그릴 수 없는 표지는 비운다 */
export const toTopBooks = (
  rows: TopBookRow[],
  storageOrigin: string
): TopBook[] =>
  rows
    .filter((r) => r.book_info?.title)
    .map((r) => {
      // 그릴 수 있는 사본이 있을 때만 YES24 를 먼저 세운다 (toCoverSource 주석 참고)
      const cover = toCoverSource({
        cover_image: toRenderableSrc(
          r.book_info?.cover_image ?? null,
          storageOrigin
        ),
        provider_item_id: r.book_info?.provider_item_id,
      });
      return {
        isbn: r.isbn,
        title: r.book_info!.title!,
        cover: cover.src,
        coverFallback: cover.fallbackSrc,
        count: Number(r.count),
      };
    });
