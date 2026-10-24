import type { PendingBook } from './types';
import type { Book } from '@/entities/book';

/** 남의 기록에서 책 정보만 떼어 낸다 — 별점·메모 같은 그 사람의 기록은 가져가지 않는다 */
export const toPendingBook = (book: Book): PendingBook => ({
  isbn: book.isbn,
  provider_item_id: book.provider_item_id,
  title: book.title,
  author: book.author,
  publisher: book.publisher,
  cover_image: book.cover_image,
  spine_image: book.spine_image,
  pub_date: book.pub_date,
  category: book.category,
  source: book.source,
});
