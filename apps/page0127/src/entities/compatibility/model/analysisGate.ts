import type { Book } from '@/entities/book';

export const COMPATIBILITY_MIN_BOOKS = 5;

/** 서버와 같은 조건: 공개 + 완독 + 평가를 남긴 기록. 연도 탭과 무관하다. */
export const countPublicCompatibilityBooks = (books: Book[]) =>
  books.filter(
    (book) =>
      book.is_public && book.status === 'completed' && book.rating !== null
  ).length;
