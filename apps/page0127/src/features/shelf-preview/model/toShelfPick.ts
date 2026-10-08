import { toRenderableSrc } from '@/shared/lib/imageHost';

import { toCoverSource } from '@/entities/book';

import type { ShelfPick } from './types';
import type { ProviderBook } from '@/shared/api/book-provider';

/** global_books 에서 읽는 열 — PendingBook 과 같은 이름이다 */
export type PickRow = {
  isbn: string;
  provider_item_id: string | null;
  title: string;
  author: string | null;
  publisher: string | null;
  cover_image: string | null;
  spine_image: string | null;
  pub_date: string | null;
  category: string | null;
  source: string | null;
};

/** `.in()` 조회는 순서를 보장하지 않는다 — 편집한 순서대로 다시 세운다 */
export const orderByIsbnList = <T extends { isbn: string }>(
  rows: T[],
  order: readonly string[]
): T[] =>
  order.flatMap((isbn) => rows.filter((r) => r.isbn === isbn).slice(0, 1));

/**
 * 화면 주소와 저장 정보를 나눠 든다.
 * - 화면: 그릴 수 있는 호스트만, YES24 먼저(toCoverSource)
 * - 저장: DB 원본 그대로 — POST /api/books 가 global_books 와 맞춰 쓴다
 */
export const fromGlobalBookRow = (
  row: PickRow,
  storageOrigin: string
): ShelfPick => {
  const cover = toCoverSource({
    cover_image: toRenderableSrc(row.cover_image, storageOrigin),
    provider_item_id: row.provider_item_id,
  });
  return {
    book: { ...row },
    coverSrc: cover.src,
    coverFallback: cover.fallbackSrc,
    spineSrc: toRenderableSrc(row.spine_image, storageOrigin),
  };
};

export const fromProviderBook = (b: ProviderBook): ShelfPick => ({
  book: {
    isbn: b.isbn,
    provider_item_id: b.providerItemId,
    title: b.title,
    author: b.author || null,
    publisher: b.publisher || null,
    cover_image: b.coverImage || null,
    spine_image: b.spineImage,
    pub_date: b.pubDate,
    category: b.category || null,
    source: b.source,
  },
  coverSrc: b.coverImage || null,
  coverFallback: null,
  spineSrc: b.spineImage,
});
