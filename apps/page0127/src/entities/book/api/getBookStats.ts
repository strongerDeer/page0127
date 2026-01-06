import { createClient } from '@/shared/config/supabase/server';
import { mapToMainCategory } from '@/shared/lib/categoryMapper';

import type { Book } from '../types';
import type {
  BookStats,
  CategoryReadingData,
  MonthlyReadingData,
  RatingReadingData,
} from '../types/stats';

/**
 * 사용자의 독서 통계 조회
 *
 * 학습 포인트:
 * - Server Component에서만 사용 (Server-Side 데이터 페칭)
 * - Supabase의 count() 기능으로 효율적인 통계 계산
 * - 에러 핸들링으로 안전한 데이터 반환
 * - 월별/카테고리별 통계 계산 로직 추가
 * - 연도별 필터링 지원
 *
 * @param userId - 사용자 ID
 * @param year - 통계 조회 연도 (null = 전체)
 * @returns 독서 통계 데이터
 */
export const getBookStats = async (
  userId: string,
  year: number | null = null
): Promise<BookStats> => {
  const supabase = await createClient();

  try {
    // 연도 필터 날짜 범위 계산
    const yearFilter =
      year !== null
        ? {
            startDate: `${year}-01-01`,
            endDate: `${year}-12-31`,
          }
        : null;

    // 1. 전체 책 수 조회 (모든 상태)
    let totalBooksQuery = supabase
      .from('books')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (yearFilter) {
      totalBooksQuery = totalBooksQuery
        .gte('created_at', yearFilter.startDate)
        .lte('created_at', yearFilter.endDate);
    }

    const { count: totalBooks, error: totalError } =
      await totalBooksQuery;

    if (totalError) throw totalError;

    // 2. 완독한 책 수 조회
    let completedBooksQuery = supabase
      .from('books')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (yearFilter) {
      completedBooksQuery = completedBooksQuery
        .gte('completed_date', yearFilter.startDate)
        .lte('completed_date', yearFilter.endDate);
    }

    const { count: completedBooks, error: completedError } =
      await completedBooksQuery;

    if (completedError) throw completedError;

    // 3. 완독한 책들의 데이터 조회 (쪽수, 완독일, 카테고리, 평점)
    let completedBooksDataQuery = supabase
      .from('books')
      .select('page_count, completed_date, category, rating')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (yearFilter) {
      completedBooksDataQuery = completedBooksDataQuery
        .gte('completed_date', yearFilter.startDate)
        .lte('completed_date', yearFilter.endDate);
    }

    const { data: completedBooksData, error: dataError } =
      await completedBooksDataQuery;

    if (dataError) throw dataError;

    // 4. 총 쪽수 계산
    const totalPages =
      completedBooksData?.reduce((sum, book) => {
        return sum + (book.page_count || 0);
      }, 0) ?? 0;

    // 5. 완독률 계산 (0-100)
    const completionRate =
      totalBooks && totalBooks > 0
        ? Math.round((completedBooks! / totalBooks) * 100)
        : 0;

    // 6. 월별 독서량 계산 (1-12월)
    const monthlyReading = calculateMonthlyReading(
      completedBooksData as Book[]
    );

    // 7. 카테고리별 독서량 계산
    const categoryReading = calculateCategoryReading(
      completedBooksData as Book[]
    );

    // 8. 평점별 독서량 계산
    const ratingReading = calculateRatingDistribution(
      completedBooksData as Book[]
    );

    // 9. 평균 평점 계산
    const averageRating = calculateAverageRating(
      completedBooksData as Book[]
    );

    // 10. 5점 만점 책 권수 계산
    const fiveStarBooks = calculateFiveStarBooks(
      completedBooksData as Book[]
    );

    return {
      totalCompletedBooks: completedBooks ?? 0,
      totalPages,
      yearlyGoal: 50, // MVP에서는 기본값 50 (향후 user 프로필에서 가져오기)
      completionRate,
      monthlyReading,
      categoryReading,
      ratingReading,
      averageRating,
      fiveStarBooks,
    };
  } catch (error) {
    console.error('통계 조회 실패:', error);

    // 에러 발생 시 기본값 반환
    return {
      totalCompletedBooks: 0,
      totalPages: 0,
      yearlyGoal: 50,
      completionRate: 0,
      monthlyReading: [],
      categoryReading: [],
      ratingReading: [],
      averageRating: 0,
      fiveStarBooks: 0,
    };
  }
};

/**
 * 월별 독서량 계산
 *
 * 학습 포인트:
 * - completed_date를 기준으로 월별 집계
 * - 1-12월 모두 표시 (데이터 없는 달은 count: 0)
 * - Recharts에서 바로 사용 가능한 형태로 반환
 */
const calculateMonthlyReading = (books: Book[]): MonthlyReadingData[] => {
  // 1-12월 초기화 (모두 count: 0)
  const monthlyData: MonthlyReadingData[] = Array.from(
    { length: 12 },
    (_, i) => ({
      month: i + 1,
      count: 0,
    })
  );

  // 완독일이 있는 책들만 필터링하고 월별로 집계
  books.forEach((book) => {
    if (book.completed_date) {
      const completedDate = new Date(book.completed_date);
      const month = completedDate.getMonth() + 1; // 0-11 → 1-12

      // 해당 월의 count 증가
      const monthData = monthlyData.find((data) => data.month === month);
      if (monthData) {
        monthData.count += 1;
      }
    }
  });

  return monthlyData;
};

/**
 * 카테고리별 독서량 계산
 *
 * 학습 포인트:
 * - category 필드를 기준으로 집계
 * - 알라딘 카테고리를 대분류로 매핑 (6-10개)
 * - 레이더 차트를 위해 6-8개로 최적화
 * - 권수가 많은 순으로 정렬, 나머지는 "기타"로 합산
 */
const calculateCategoryReading = (books: Book[]): CategoryReadingData[] => {
  const MAX_CATEGORIES = 7; // Top 7개 + 기타
  const MIN_CATEGORIES = 6; // 레이더 차트 최소 축 개수

  // 카테고리별 카운트 맵 생성
  const categoryMap = new Map<string, number>();

  books.forEach((book) => {
    // 알라딘 카테고리를 대분류로 매핑
    const mainCategory = mapToMainCategory(book.category);
    // "기타"는 나중에 따로 처리하므로 일단 집계
    categoryMap.set(mainCategory, (categoryMap.get(mainCategory) || 0) + 1);
  });

  // Map을 배열로 변환하고 권수 많은 순으로 정렬
  const sortedCategories = Array.from(categoryMap.entries())
    .map(([category, count]) => ({
      category,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // "기타"를 제외한 카테고리들
  const nonEtcCategories = sortedCategories.filter(
    (cat) => cat.category !== '기타'
  );
  const etcCategory = sortedCategories.find((cat) => cat.category === '기타');

  // Case 1: 카테고리가 MAX_CATEGORIES 이하인 경우
  if (nonEtcCategories.length <= MAX_CATEGORIES) {
    const result = [...nonEtcCategories];

    // 최소 개수 미달 시 더미 카테고리 추가 (레이더 차트 축 유지)
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

    // 이미 있는 카테고리 제외하고 더미 추가
    const existingCategories = new Set(result.map((r) => r.category));
    for (const dummyCategory of dummyCategories) {
      if (result.length >= MIN_CATEGORIES) break;
      if (!existingCategories.has(dummyCategory)) {
        result.push({
          category: dummyCategory,
          count: 0,
        });
      }
    }

    // "기타"가 있으면 마지막에 추가
    if (etcCategory) {
      result.push(etcCategory);
    }

    return result;
  }

  // Case 2: 카테고리가 MAX_CATEGORIES 초과인 경우
  // Top MAX_CATEGORIES개만 유지하고 나머지는 "기타"로 합산
  const topCategories = nonEtcCategories.slice(0, MAX_CATEGORIES);
  const restCategories = nonEtcCategories.slice(MAX_CATEGORIES);

  // 나머지 카테고리 + 원래 "기타" 합산
  const etcCount =
    restCategories.reduce((sum, cat) => sum + cat.count, 0) +
    (etcCategory?.count || 0);

  // "기타"가 있으면 마지막에 추가
  if (etcCount > 0) {
    return [
      ...topCategories,
      {
        category: '기타',
        count: etcCount,
      },
    ];
  }

  return topCategories;
};

/**
 * 평점별 독서량 계산
 *
 * 학습 포인트:
 * - rating 필드를 기준으로 0, 1, 2, 3, 4, 5, 10점 집계
 * - Recharts PieChart(Doughnut)를 위한 데이터 구조
 * - 색상 그라데이션: 10점(진한 초록) → 0점(회색)
 * - 유효한 평점만 집계 (0, 1, 2, 3, 4, 5, 10)
 */
const calculateRatingDistribution = (books: Book[]): RatingReadingData[] => {
  // 평점 색상 매핑 (10점 → 0점: 블루 → 회색)
  const RATING_COLORS: Record<number, string> = {
    10: '#4338ca', // indigo-700
    5: '#3b82f6', // blue-500
    4: '#60a5fa', // blue-400
    3: '#a78bfa', // violet-400
    2: '#818cf8', // indigo-400
    1: '#c084fc', // purple-400
    0: '#9ca3af', // gray-400
  };

  // 유효한 평점 목록 (내림차순)
  const validRatings = [10, 5, 4, 3, 2, 1, 0];

  // 평점 데이터 초기화
  const ratingData: RatingReadingData[] = validRatings.map((rating) => ({
    rating,
    count: 0,
    fill: RATING_COLORS[rating],
  }));

  // 평점이 있는 책들만 집계
  books.forEach((book) => {
    if (book.rating !== null && book.rating !== undefined && validRatings.includes(book.rating)) {
      const ratingItem = ratingData.find((data) => data.rating === book.rating);
      if (ratingItem) {
        ratingItem.count += 1;
      }
    }
  });

  return ratingData;
};

/**
 * 평균 평점 계산
 *
 * 학습 포인트:
 * - 평점이 있는 책들의 평균 계산
 * - 소수점 한 자리까지 표시
 * - 평점이 없는 경우 0 반환
 * - 유효한 평점: 0, 1, 2, 3, 4, 5, 10
 */
const calculateAverageRating = (books: Book[]): number => {
  // 유효한 평점 목록
  const validRatings = [0, 1, 2, 3, 4, 5, 10];

  // 평점이 있는 책들만 필터링
  const ratedBooks = books.filter(
    (book) => book.rating !== null && book.rating !== undefined && validRatings.includes(book.rating)
  );

  if (ratedBooks.length === 0) return 0;

  // 평균 계산 (소수점 한 자리)
  const sum = ratedBooks.reduce((acc, book) => acc + (book.rating || 0), 0);
  return Math.round((sum / ratedBooks.length) * 10) / 10;
};

/**
 * 5점 만점 책 권수 계산
 *
 * 학습 포인트:
 * - rating이 5인 책들의 개수 집계
 * - 최고 평점 통계에 사용
 */
const calculateFiveStarBooks = (books: Book[]): number => {
  return books.filter((book) => book.rating === 5).length;
};
