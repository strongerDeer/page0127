import { createClient } from '@/shared/config/supabase/server';
import { mapToMainCategory } from '@/shared/lib/categoryMapper';

import type { Book } from '../types';
import type {
  CategoryReadingData,
  OverallStats,
  RatingDistribution,
  ReadingJourney,
  YearlyTrend,
} from '../types/stats';

/**
 * 전체 독서 통계 조회 (All Time Stats)
 *
 * 학습 포인트:
 * - 전체 기간의 독서 히스토리 통계
 * - 연도 무관, 모든 완독한 책 기준
 * - Server Component에서만 사용
 * - 대시보드 상단 "전체 독서 통계" 섹션에 사용
 *
 * @param userId - 사용자 ID
 * @returns 전체 독서 통계
 */
export const getOverallStats = async (
  userId: string
): Promise<OverallStats> => {
  const supabase = await createClient();

  try {
    // 완독한 책들의 데이터 전체 조회
    const { data: completedBooks, error } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('completed_date', 'is', null)
      .order('completed_date', { ascending: true });

    if (error) throw error;
    if (!completedBooks || completedBooks.length === 0) {
      return getEmptyStats();
    }

    // 1. 독서 여정 계산
    const journey = calculateReadingJourney(completedBooks as Book[]);

    // 2. 최근 5년 독서량 계산
    const yearlyTrend = calculateYearlyTrend(completedBooks as Book[]);

    // 3. 평점 분포 계산
    const ratingDistribution = calculateRatingDistribution(
      completedBooks as Book[]
    );

    // 4. 전체 카테고리 분포 계산
    const categoryDistribution = calculateCategoryDistribution(
      completedBooks as Book[]
    );

    return {
      journey,
      yearlyTrend,
      ratingDistribution,
      categoryDistribution,
    };
  } catch (error) {
    console.error('전체 통계 조회 실패:', error);
    return getEmptyStats();
  }
};

/**
 * 독서 여정 계산
 *
 * 학습 포인트:
 * - 총 읽은 책, 10점 만점 책
 * - 총 읽은 쪽수, 하루 평균 쪽수
 * - 독서 기간, 예상 독서 시간
 */
const calculateReadingJourney = (books: Book[]): ReadingJourney => {
  const totalBooks = books.length;

  // 10점 만점 책
  const perfectScoreBooks = books.filter((book) => book.rating === 10).length;
  const perfectScoreRate =
    totalBooks > 0 ? Math.round((perfectScoreBooks / totalBooks) * 100) : 0;

  // 총 읽은 쪽수
  const totalPages = books.reduce((sum, book) => sum + (book.page_count || 0), 0);

  // 독서 시작일 (첫 완독일)
  const firstBook = books[0]; // 이미 completed_date 오름차순 정렬됨
  const readingSince = firstBook?.completed_date || new Date().toISOString();

  // 독서 년수 계산
  const firstDate = new Date(readingSince);
  const today = new Date();
  const yearsDiff = today.getFullYear() - firstDate.getFullYear();
  const monthsDiff = today.getMonth() - firstDate.getMonth();
  const readingYears =
    yearsDiff + (monthsDiff < 0 ? -1 : 0) + (monthsDiff === 0 && today.getDate() < firstDate.getDate() ? -1 : 0);

  // 하루 평균 쪽수
  const daysSince = Math.floor(
    (today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const averagePagesPerDay =
    daysSince > 0 ? parseFloat((totalPages / daysSince).toFixed(1)) : 0;

  // 예상 독서 시간 (분당 1페이지 기준)
  const estimatedMinutes = totalPages * 1; // 1분/페이지
  const estimatedHours = Math.round(estimatedMinutes / 60);
  const estimatedDays = Math.round(estimatedHours / 24);

  return {
    totalBooks,
    perfectScoreBooks,
    perfectScoreRate,
    totalPages,
    averagePagesPerDay,
    readingSince,
    readingYears: Math.max(readingYears, 0), // 음수 방지
    estimatedHours,
    estimatedDays,
  };
};

/**
 * 최근 5년 독서량 계산 (Bar Chart용)
 *
 * 학습 포인트:
 * - 완독일 기준으로 연도별 집계
 * - 최근 5년만 표시 (데이터 부족 시 전체)
 * - 오름차순 정렬 (2020 → 2024)
 */
const calculateYearlyTrend = (books: Book[]): YearlyTrend[] => {
  const MAX_YEARS = 5;

  // 연도별 카운트 맵 생성
  const yearMap = new Map<number, number>();

  books.forEach((book) => {
    if (book.completed_date) {
      const year = new Date(book.completed_date).getFullYear();
      yearMap.set(year, (yearMap.get(year) || 0) + 1);
    }
  });

  // 연도 오름차순 정렬
  const sortedYears = Array.from(yearMap.entries())
    .map(([year, count]) => ({
      year,
      count,
    }))
    .sort((a, b) => a.year - b.year);

  // 최근 5년만 가져오기
  const recentYears =
    sortedYears.length > MAX_YEARS
      ? sortedYears.slice(-MAX_YEARS)
      : sortedYears;

  return recentYears;
};

/**
 * 평점 분포 계산 (Horizontal Bar용)
 *
 * 학습 포인트:
 * - 0, 1, 2, 3, 4, 5, 10점 집계
 * - 비율 계산 (%)
 * - 내림차순 정렬 (10 → 0)
 */
const calculateRatingDistribution = (books: Book[]): RatingDistribution[] => {
  const validRatings = [10, 5, 4, 3, 2, 1, 0];

  // 평점별 카운트 맵 생성
  const ratingMap = new Map<number, number>();
  validRatings.forEach((rating) => ratingMap.set(rating, 0));

  books.forEach((book) => {
    if (
      book.rating !== null &&
      book.rating !== undefined &&
      validRatings.includes(book.rating)
    ) {
      ratingMap.set(book.rating, (ratingMap.get(book.rating) || 0) + 1);
    }
  });

  // 비율 계산
  const totalBooks = books.length;
  const result = validRatings.map((rating) => {
    const count = ratingMap.get(rating) || 0;
    const percentage = Math.round((count / totalBooks) * 100);
    return {
      rating,
      count,
      percentage,
    };
  });

  return result;
};

/**
 * 전체 카테고리 분포 계산
 *
 * 학습 포인트:
 * - 연도별(getBookStats)은 레이더 차트용이라 더미 축을 채우지만,
 *   전체 통계는 실제 데이터만 권수 많은 순으로 보여준다.
 * - 알라딘 세부 카테고리를 대분류로 매핑해 집계
 */
const calculateCategoryDistribution = (
  books: Book[]
): CategoryReadingData[] => {
  const categoryMap = new Map<string, number>();

  books.forEach((book) => {
    const mainCategory = mapToMainCategory(book.category);
    categoryMap.set(mainCategory, (categoryMap.get(mainCategory) || 0) + 1);
  });

  return Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
};

/**
 * 빈 통계 반환 (에러 또는 데이터 없을 때)
 */
const getEmptyStats = (): OverallStats => {
  return {
    journey: {
      totalBooks: 0,
      perfectScoreBooks: 0,
      perfectScoreRate: 0,
      totalPages: 0,
      averagePagesPerDay: 0,
      readingSince: new Date().toISOString(),
      readingYears: 0,
      estimatedHours: 0,
      estimatedDays: 0,
    },
    yearlyTrend: [],
    ratingDistribution: [],
    categoryDistribution: [],
  };
};
