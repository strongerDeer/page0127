import { mapToMainCategory } from '@/shared/lib/categoryMapper';

import type { Book } from '@/entities/book';

/** 정렬 "분야순"의 값 — DashboardBookList 정렬 셀렉트와 책장이 함께 쓴다 */
export const CATEGORY_SORT = 'category-asc';

/**
 * 같은 분야끼리 붙여 세운다(HJ, 2026-11-24 — 분야마다 선반을 새로 시작하던 책장을 대신).
 *
 * - 분야 순서: 많이 읽은 분야부터, '기타'는 늘 맨 끝(예전 분야별 책장과 같은 규칙)
 * - 분야 안 순서: 들어온 순서 그대로(안정 정렬) — 부르는 쪽이 최신순으로 넘긴다
 *
 * 선반은 이어 꽂고 경계에만 칸막이를 세운다 → 분야마다 반쯤 빈 줄이 생기지 않는다.
 */
export const orderByCategory = (books: Book[]): Book[] => {
  const buckets = new Map<string, Book[]>();
  books.forEach((book) => {
    const category = bookendCategory(book);
    const bucket = buckets.get(category);
    if (bucket) bucket.push(book);
    else buckets.set(category, [book]);
  });

  return [...buckets.entries()]
    .sort(([a, booksA], [b, booksB]) => {
      if (a === '기타') return 1;
      if (b === '기타') return -1;
      return booksB.length - booksA.length;
    })
    .flatMap(([, bucket]) => bucket);
};

/** 책장 북엔드에 적을 분야 이름 — orderByCategory 와 같은 기준으로 묶여야 경계가 맞는다 */
export const bookendCategory = (book: Pick<Book, 'category'>): string =>
  mapToMainCategory(book.category);
