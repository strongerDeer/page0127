import { mapToMainCategory } from '../../../shared/lib/categoryMapper';

import type { Book } from '../types';
import type {
  BookStats,
  CategoryReadingData,
  MonthlyReadingData,
  RatingReadingData,
} from '../types/stats';

const VALID_RATINGS = [10, 5, 4, 3, 2, 1, 0] as const;

const RATING_COLORS: Record<number, string> = {
  10: '#22c55e',
  5: '#3b82f6',
  4: '#a855f7',
  3: '#f59e0b',
  2: '#14b8a6',
  1: '#f43f5e',
  0: '#cbd5e1',
};

const getYear = (date: string | null): number | null => {
  if (!date) return null;

  const year = Number(date.slice(0, 4));
  return Number.isInteger(year) && year > 0 ? year : null;
};

export const getCurrentLibraryYear = (date: Date = new Date()): number =>
  Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
    }).format(date)
  );

/**
 * 책을 어느 연도 책장에 놓을지 결정한다.
 *
 * - 완독일이 있으면 완독 연도
 * - 완독일이 없고 시작일이 있으면 시작 연도
 * - 날짜를 설정하지 않았으면 현재 연도
 *
 * 마지막 규칙 덕분에 날짜 없는 진행 중/읽고 싶은 책은 해가 바뀌면
 * 새 현재 연도 책장으로 자연스럽게 이동한다.
 */
export const getBookLibraryYear = (
  book: Pick<Book, 'completed_date' | 'start_date'>,
  currentYear: number
): number =>
  getYear(book.completed_date) ?? getYear(book.start_date) ?? currentYear;

export const filterBooksByLibraryYear = (
  books: Book[],
  year: number | null,
  currentYear: number
): Book[] => {
  if (year === null) return books;

  return books.filter((book) => getBookLibraryYear(book, currentYear) === year);
};

export const getLibraryYears = (books: Book[], currentYear: number): number[] =>
  Array.from(
    new Set([
      currentYear,
      ...books.map((book) => getBookLibraryYear(book, currentYear)),
    ])
  ).sort((a, b) => b - a);

const calculateMonthlyReading = (books: Book[]): MonthlyReadingData[] => {
  const monthlyData = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    count: 0,
  }));

  books.forEach((book) => {
    if (!book.completed_date) return;

    const month = Number(book.completed_date.slice(5, 7));
    if (month >= 1 && month <= 12) {
      monthlyData[month - 1].count += 1;
    }
  });

  return monthlyData;
};

const calculateCategoryReading = (books: Book[]): CategoryReadingData[] => {
  const MAX_CATEGORIES = 7;
  const MIN_CATEGORIES = 6;
  const categoryMap = new Map<string, number>();

  books.forEach((book) => {
    const category = mapToMainCategory(book.category);
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + 1);
  });

  const sortedCategories = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
  const nonEtcCategories = sortedCategories.filter(
    ({ category }) => category !== '기타'
  );
  const etcCategory = sortedCategories.find(
    ({ category }) => category === '기타'
  );

  if (nonEtcCategories.length <= MAX_CATEGORIES) {
    const result = [...nonEtcCategories];
    const dummyCategories = [
      '소설/시/희곡',
      '경제경영',
      '자기계발',
      '인문학',
      '사회과학',
      '과학',
      '기술공학',
      '예술/대중문화',
    ];
    const existingCategories = new Set(result.map(({ category }) => category));

    for (const category of dummyCategories) {
      if (result.length >= MIN_CATEGORIES) break;
      if (!existingCategories.has(category)) {
        result.push({ category, count: 0 });
      }
    }

    if (etcCategory) result.push(etcCategory);
    return result;
  }

  const topCategories = nonEtcCategories.slice(0, MAX_CATEGORIES);
  const etcCount =
    nonEtcCategories
      .slice(MAX_CATEGORIES)
      .reduce((sum, { count }) => sum + count, 0) + (etcCategory?.count ?? 0);

  return etcCount > 0
    ? [...topCategories, { category: '기타', count: etcCount }]
    : topCategories;
};

const calculateRatingReading = (books: Book[]): RatingReadingData[] => {
  const ratingData = VALID_RATINGS.map((rating) => ({
    rating,
    count: 0,
    fill: RATING_COLORS[rating],
  }));

  books.forEach((book) => {
    const item = ratingData.find(({ rating }) => rating === book.rating);
    if (item) item.count += 1;
  });

  return ratingData;
};

/**
 * 이미 조회한 책 목록으로 통계를 계산한다.
 * 연도 탭을 바꿀 때 Supabase를 다시 호출하지 않기 위한 순수 함수다.
 */
export const calculateBookStats = (
  books: Book[],
  year: number | null,
  currentYear: number
): BookStats => {
  const scopedBooks = filterBooksByLibraryYear(books, year, currentYear);
  const completedBooks = scopedBooks.filter(
    (book) => book.status === 'completed' && book.completed_date
  );
  const ratedBooks = completedBooks.filter(
    (book) =>
      book.rating !== null &&
      VALID_RATINGS.includes(book.rating as (typeof VALID_RATINGS)[number])
  );
  const totalPages = completedBooks.reduce(
    (sum, book) => sum + (book.page_count ?? 0),
    0
  );
  const ratingSum = ratedBooks.reduce(
    (sum, book) => sum + (book.rating ?? 0),
    0
  );

  return {
    totalCompletedBooks: completedBooks.length,
    totalPages,
    yearlyGoal: 50,
    completionRate:
      scopedBooks.length > 0
        ? Math.round((completedBooks.length / scopedBooks.length) * 100)
        : 0,
    monthlyReading: calculateMonthlyReading(completedBooks),
    categoryReading: calculateCategoryReading(completedBooks),
    ratingReading: calculateRatingReading(completedBooks),
    averageRating:
      ratedBooks.length > 0
        ? Math.round((ratingSum / ratedBooks.length) * 10) / 10
        : 0,
    fiveStarBooks: completedBooks.filter((book) => book.rating === 5).length,
  };
};
