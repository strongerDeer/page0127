import type { ProviderBook } from './types';

export type ManualCatalogBook = {
  isbn: string;
  title: string;
  author: string | null;
  publisher: string | null;
  source_url: string | null;
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
  coverImage: '',
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
