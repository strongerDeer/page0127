import { createClient } from '@/shared/config/supabase/server';

import { getCompletedYear } from '../model/completedWhen';
import { dedupeReadings } from '../model/dedupeReadings';

import type { Book } from '../types';
import type {
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
 * @param publicOnly - 공개(is_public) 책만 집계할지 (공개 서재용)
 * @returns 전체 독서 통계
 */
export const getOverallStats = async (
  userId: string,
  publicOnly = false
): Promise<OverallStats> => {
  const supabase = await createClient();

  try {
    // 완독한 책들의 데이터 전체 조회
    let query = supabase
      .from('books')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      // 완독 시점을 모르는 책(날짜·연도 모두 없음)도 전체 통계에는 센다.
      // 연도별 추이에서만 빠진다 — model/completedWhen.ts 참고
      .order('completed_date', { ascending: true, nullsFirst: false });

    // 공개 서재 경로에서는 RLS에만 기대지 않고 코드에서도 명시적으로 거른다
    if (publicOnly) {
      query = query.eq('is_public', true);
    }

    const { data: completedBooks, error } = await query;

    if (error) throw error;
    if (!completedBooks || completedBooks.length === 0) {
      return getEmptyStats();
    }

    // 재독은 새 row 로 쌓인다 — 여기는 '전체 기간' 통계이므로 전체 범위에서
    // 같은 책을 한 권으로 센다. (연도별 추이만 연도 안에서 따로 합친다)
    const allReadings = completedBooks as Book[];
    const uniqueBooks = dedupeReadings(allReadings);

    // 1. 독서 여정 계산
    // 시작일만은 합치기 전 목록으로 구한다 — 합치면 대표가 '최신 회독'이라
    // 2020년에 처음 읽은 책이 2026년 재독 날짜로 바뀌어 시작일이 밀린다
    const journey = calculateReadingJourney(uniqueBooks, allReadings);

    // 2. 최근 5년 독서량 계산
    const yearlyTrend = calculateYearlyTrend(allReadings);

    // 3. 평점 분포 계산
    const ratingDistribution = calculateRatingDistribution(uniqueBooks);

    // 분야는 여기서 세지 않는다 — 전체 탭도 연도 탭과 같은 독서 균형 카드가
    // 받은 책 목록으로 직접 센다(calculateReadingBalance)
    return {
      journey,
      yearlyTrend,
      ratingDistribution,
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
 * - 총 읽은 책, 인생책
 * - 총 읽은 쪽수, 하루 평균 쪽수
 * - 독서 기간, 예상 독서 시간
 *
 * @param books 회독을 합친 목록 — 권수·쪽수는 서로 다른 책 기준으로 센다
 * @param allReadings 합치기 전 전체 회독 기록 (완독일 오름차순) — 시작일 계산용
 */
const calculateReadingJourney = (
  books: Book[],
  allReadings: Book[]
): ReadingJourney => {
  const totalBooks = books.length;

  // 인생책 (is_life_book 플래그 — 전에는 rating=10 이라는 매직값이었다)
  const lifeBookCount = books.filter((book) => book.is_life_book).length;
  const lifeBookRate =
    totalBooks > 0 ? Math.round((lifeBookCount / totalBooks) * 100) : 0;

  // 총 읽은 쪽수
  const totalPages = books.reduce(
    (sum, book) => sum + (book.page_count || 0),
    0
  );

  // 독서 시작일 (첫 완독일) — 합치기 전 목록이라야 옛 1회독 날짜가 살아 있다.
  // 연도만 아는 책은 그해 1월 1일로 본다. 모르는 책은 시작일 계산에서 빠진다.
  // 'YYYY-MM-DD' 문자열은 사전순이 곧 날짜순이다.
  const readingSince =
    allReadings
      .map(
        (book) =>
          book.completed_date ??
          (book.completed_year ? `${book.completed_year}-01-01` : null)
      )
      .filter((date): date is string => date !== null)
      .sort()[0] ?? new Date().toISOString();

  // 독서 년수 계산
  const firstDate = new Date(readingSince);
  const today = new Date();
  const yearsDiff = today.getFullYear() - firstDate.getFullYear();
  const monthsDiff = today.getMonth() - firstDate.getMonth();
  const readingYears =
    yearsDiff +
    (monthsDiff < 0 ? -1 : 0) +
    (monthsDiff === 0 && today.getDate() < firstDate.getDate() ? -1 : 0);

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
    lifeBookCount,
    lifeBookRate,
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
 *
 * 회독은 '그 연도 안에서' 합친다. 전체 기준으로 먼저 합치면 옛 회독이 사라져
 * 지난 연도 막대가 실제보다 낮아진다 — 2020년에 읽은 사실은 남아야 한다.
 * 그래서 연도 막대의 합이 '총 읽은 책'보다 클 수 있다(해를 걸친 재독).
 */
const calculateYearlyTrend = (allReadings: Book[]): YearlyTrend[] => {
  const MAX_YEARS = 5;

  // 연도별로 기록을 모은 뒤, 각 연도 안에서 같은 책을 한 권으로 합친다
  const readingsByYear = new Map<number, Book[]>();

  allReadings.forEach((book) => {
    // 연도만 기록한 책도 그 해 막대에 들어간다. 모르는 책은 빠진다
    const year = getCompletedYear(book);
    if (year !== null) {
      readingsByYear.set(year, [...(readingsByYear.get(year) ?? []), book]);
    }
  });

  // 연도 오름차순 정렬
  const sortedYears = Array.from(readingsByYear.entries())
    .map(([year, readings]) => ({
      year,
      count: dedupeReadings(readings).length,
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
 * - 0, 1, 2, 3, 4, 5점 집계 — 인생책은 rating=5 라 is_life_book 으로 별도 항목이다
 * - 비율 계산 (%)
 * - 내림차순 정렬(인생책 → 5 → 0), 인생책이 5점보다 위
 */
const calculateRatingDistribution = (books: Book[]): RatingDistribution[] => {
  // 분포 버킷. 인생책은 rating=5 라 평점만으로는 5점과 구별되지 않는다
  // → (rating, is_life_book) 조합이 버킷 키다. 인생책을 맨 위에 둔다.
  const buckets = [
    { rating: 5, is_life_book: true },
    { rating: 5, is_life_book: false },
    { rating: 4, is_life_book: false },
    { rating: 3, is_life_book: false },
    { rating: 2, is_life_book: false },
    { rating: 1, is_life_book: false },
    { rating: 0, is_life_book: false },
  ];

  // (rating, is_life_book) 합성 키로 카운트 맵 생성 — rating 만으로는
  // 인생책(5점)과 일반 5점을 구별할 수 없다
  const toKey = (rating: number, isLifeBook: boolean) =>
    `${rating}:${isLifeBook}`;

  const ratingMap = new Map<string, number>();
  buckets.forEach(({ rating, is_life_book }) => {
    ratingMap.set(toKey(rating, is_life_book), 0);
  });

  books.forEach((book) => {
    // 인생책은 점수와 무관하게 '인생책' 칸으로 보낸다. 인생책 버킷의 rating 이
    // 5 로 고정돼 있어, 두 값을 그대로 키로 쓰면 '4점인데 인생책'인 책이 어느
    // 칸에도 못 들어가고 조용히 빠진다 — 분포 합이 총 권수보다 적어진다.
    // 회독을 합치면(1회독 5점 인생책 + 2회독 4점) 이 조합이 실제로 만들어진다.
    // rating 이 null/undefined 거나 버킷에 없는 값이면 key 가 안 맞아 자연히 걸러진다
    const key = book.is_life_book
      ? toKey(5, true)
      : toKey(book.rating ?? NaN, false);
    if (ratingMap.has(key)) {
      ratingMap.set(key, (ratingMap.get(key) || 0) + 1);
    }
  });

  // 비율 계산 — 분모(books.length)는 그대로 둔다
  const totalBooks = books.length;

  return buckets.map(({ rating, is_life_book }) => {
    const count = ratingMap.get(toKey(rating, is_life_book)) || 0;
    const percentage = Math.round((count / totalBooks) * 100);
    return {
      rating,
      is_life_book,
      count,
      percentage,
    };
  });
};

/**
 * 빈 통계 반환 (에러 또는 데이터 없을 때)
 */
const getEmptyStats = (): OverallStats => {
  return {
    journey: {
      totalBooks: 0,
      lifeBookCount: 0,
      lifeBookRate: 0,
      totalPages: 0,
      averagePagesPerDay: 0,
      readingSince: new Date().toISOString(),
      readingYears: 0,
      estimatedHours: 0,
      estimatedDays: 0,
    },
    yearlyTrend: [],
    ratingDistribution: [],
  };
};
