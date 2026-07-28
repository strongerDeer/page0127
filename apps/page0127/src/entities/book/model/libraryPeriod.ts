import { mapToMainCategory } from '../../../shared/lib/categoryMapper';
import { averageScore } from './rating';

import type { Book } from '../types';
import type {
  BookStats,
  CategoryReadingData,
  MonthlyReadingData,
  RatingReadingData,
} from '../types/stats';

// 분포 버킷. 인생책은 이제 rating=5 라 평점만으로는 5점과 구별되지 않는다
// → (rating, is_life_book) 조합이 버킷 키다. 인생책을 맨 위에 둔다.
const RATING_BUCKETS = [
  { rating: 5, is_life_book: true, fill: '#22c55e' },
  { rating: 5, is_life_book: false, fill: '#3b82f6' },
  { rating: 4, is_life_book: false, fill: '#a855f7' },
  { rating: 3, is_life_book: false, fill: '#f59e0b' },
  { rating: 2, is_life_book: false, fill: '#14b8a6' },
  { rating: 1, is_life_book: false, fill: '#f43f5e' },
  { rating: 0, is_life_book: false, fill: '#cbd5e1' },
] as const;

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
  const ratingData = RATING_BUCKETS.map((bucket) => ({ ...bucket, count: 0 }));

  books.forEach((book) => {
    const item = ratingData.find(
      // 인생책은 rating 이 5 라도 별도 항목이다 — 두 값을 모두 본다
      (b) => b.rating === book.rating && b.is_life_book === book.is_life_book
    );
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
  const totalPages = completedBooks.reduce(
    (sum, book) => sum + (book.page_count ?? 0),
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
    // 0("평가 안 함")은 제외한다 — model/rating.ts 참고
    averageRating: averageScore(completedBooks.map((book) => book.rating)),
    // 화면 라벨이 '인생책'이므로 세는 기준도 is_life_book 플래그여야 한다.
    // 전에는 rating === 5 만 세서, 같은 라벨이 탭에 따라 다른 숫자를 보여줬다.
    lifeBookCount: completedBooks.filter((book) => book.is_life_book).length,
  };
};
