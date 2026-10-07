import { toRenderableSrc } from '@/shared/lib/imageHost';

export type TopBook = {
  isbn: string;
  title: string;
  cover: string | null;
  count: number;
};

/** get_most_read_books RPC 의 행 — count 는 bigint 라 문자열로 올 수 있다 */
export type TopBookRow = {
  isbn: string;
  count: number | string;
  book_info: { title?: string; cover_image?: string | null } | null;
};

/** 랭킹 행을 카드에 쓸 모양으로 바꾼다. 제목 없는 행은 빼고, 그릴 수 없는 표지는 비운다 */
export const toTopBooks = (
  rows: TopBookRow[],
  storageOrigin: string
): TopBook[] =>
  rows
    .filter((r) => r.book_info?.title)
    .map((r) => ({
      isbn: r.isbn,
      title: r.book_info!.title!,
      cover: toRenderableSrc(r.book_info?.cover_image ?? null, storageOrigin),
      count: Number(r.count),
    }));
