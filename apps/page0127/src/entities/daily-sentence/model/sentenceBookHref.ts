import type { DailySentence } from './types';

/**
 * 펼친 문장의 "이 책 보러 가기" 주소.
 *
 * 1. 우리 도서 정보에 있는 책 → 도서 정보 화면(읽은 사람·코멘트를 볼 수 있다)
 * 2. 없지만 ISBN 이 있다 → 담기 화면(`/books/add?isbn=&title=`, 검색을 건너뛰고 그 책의 폼이 열린다)
 * 3. ISBN 도 없다 → 링크 없음
 */
export const sentenceBookHref = (
  sentence: Pick<DailySentence, 'isbn' | 'book_title'>,
  bookInfoId: string | null
): string | null => {
  if (bookInfoId) return `/books/info/${bookInfoId}`;
  if (!sentence.isbn) return null;
  const params = new URLSearchParams({
    isbn: sentence.isbn,
    title: sentence.book_title,
  });
  return `/books/add?${params}`;
};
