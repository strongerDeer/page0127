import {
  MAIN_CATEGORIES,
  type MainCategory,
  mapToMainCategory,
} from '../../../shared/lib/categoryMapper';

import type { Book } from '../types';

/**
 * 분야 균형 — "고르게 읽고 있나".
 *
 * 학습 포인트: 고른 정도 = 정규화 섀넌 엔트로피.
 *   H = −Σ p·ln p (p = 그 분야 비율), 최댓값은 ln 9(9개 분야가 똑같을 때)
 *   score = H / ln 9 × 100 → 한 분야만 읽으면 0, 9개를 고르게 읽으면 100.
 * '기타'는 분류 불명이라 "새 분야를 읽었다"고 볼 수 없어 계산에서 뺀다.
 */
export type BalanceCategory = Exclude<MainCategory, '기타'>;

export const BALANCE_CATEGORIES = MAIN_CATEGORIES.filter(
  (category): category is BalanceCategory => category !== '기타'
);

export type ReadingBalance = {
  /** 9개 분야 권수 — BALANCE_CATEGORIES 순서 고정(레이더 축) */
  categories: { category: BalanceCategory; count: number }[];
  /** 1권 이상 분야, 많은 순(동률은 BALANCE_CATEGORIES 순서). share 는 0~100 정수 */
  ranked: { category: BalanceCategory; count: number; share: number }[];
  /** 기타 제외 완독 권수 */
  total: number;
  /** 1권 이상 분야 수 */
  readCount: number;
  /** 상위 2개 분야 비율 0~100 정수 */
  topShare: number;
  /** 0~100, 완독이 3권 미만이면 null */
  score: number | null;
  zero: BalanceCategory[];
  /** 작년 대비 — 작년 완독이 없으면 null */
  prev: { readCountDelta: number; newCategories: BalanceCategory[] } | null;
};

/** 이보다 적으면 점수가 한 권에 크게 흔들려 의미가 없다 */
const MIN_BOOKS_FOR_SCORE = 3;

const countByCategory = (books: Book[]) => {
  const counts = new Map<BalanceCategory, number>(
    BALANCE_CATEGORIES.map((category) => [category, 0])
  );
  books
    .filter((book) => book.status === 'completed')
    .forEach((book) => {
      const category = mapToMainCategory(book.category);
      if (category === '기타') return;
      counts.set(category, (counts.get(category) ?? 0) + 1);
    });
  return counts;
};

export const calculateReadingBalance = (
  books: Book[],
  prevYearBooks: Book[] = []
): ReadingBalance => {
  const counts = countByCategory(books);
  const categories = BALANCE_CATEGORIES.map((category) => ({
    category,
    count: counts.get(category) ?? 0,
  }));
  const total = categories.reduce((sum, { count }) => sum + count, 0);

  // sort 는 안정 정렬 → 동률이면 BALANCE_CATEGORIES 순서가 유지된다
  const ranked = categories
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count)
    .map(({ category, count }) => ({
      category,
      count,
      share: Math.round((count / total) * 100),
    }));

  const readCount = ranked.length;
  const topTwo = ranked.slice(0, 2).reduce((sum, { count }) => sum + count, 0);
  const topShare = total > 0 ? Math.round((topTwo / total) * 100) : 0;

  const entropy = ranked.reduce((sum, { count }) => {
    const p = count / total;
    return sum - p * Math.log(p);
  }, 0);
  const score =
    total < MIN_BOOKS_FOR_SCORE
      ? null
      : Math.round((entropy / Math.log(BALANCE_CATEGORIES.length)) * 100);

  const prevCounts = countByCategory(prevYearBooks);
  const prevRead = BALANCE_CATEGORIES.filter(
    (category) => (prevCounts.get(category) ?? 0) > 0
  );
  const prev =
    prevRead.length === 0
      ? null
      : {
          readCountDelta: readCount - prevRead.length,
          newCategories: ranked
            .map(({ category }) => category)
            .filter((category) => !prevRead.includes(category)),
        };

  return {
    categories,
    ranked,
    total,
    readCount,
    topShare,
    score,
    zero: categories
      .filter(({ count }) => count === 0)
      .map(({ category }) => category),
    prev,
  };
};
