import type { ProviderBook } from './types';

export type ManualCatalogBook = {
  isbn: string;
  title: string;
  author: string | null;
  publisher: string | null;
  source_url: string | null;
  // 직접 올린 표지 — 검수 승인된 것만 검색에 나오므로 여기 오는 표지도 승인된 것이다
  cover_image?: string | null;
};
export const toManualProviderBook = (
  book: ManualCatalogBook
): ProviderBook => ({
  isbn: book.isbn,
  title: book.title,
  author: book.author ?? '',
  publisher: book.publisher ?? '',
  source: 'manual',
  subTitle: null,
  coverImage: book.cover_image ?? '',
  spineImage: null,
  backImage: null,
  providerItemId: null,
  providerLink: '',
  sourceUrl: book.source_url,
  pubDate: null,
  description: '',
  category: '',
  page: null,
  toc: null,
  dimensions: null,
});
