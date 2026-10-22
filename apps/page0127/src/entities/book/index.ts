// entities/book public API
// 외부 슬라이스/레이어는 항상 '@/entities/book'을 통해 import 한다
// 내부 폴더 구조(types/, api/, model/)는 외부에 노출하지 않는다

// 도메인 타입
export type {
  Book,
  BookInput,
  BookRanking,
  BookRating,
  BookStats,
  BookStatus,
  GlobalBook,
  ProviderBook,
  ProviderSearchResult,
} from './types';

// 통계 도메인 타입
export type {
  CategoryReadingData,
  MonthlyReadingData,
  OverallStats,
  RatingDistribution,
  RatingReadingData,
  ReadingJourney,
  YearlyTrend,
} from './types/stats';

// 데이터 페칭 API (클라이언트 안전)
// 주의: next/headers 에 의존하는 서버 전용 함수는 './server' 에서 별도로 export 한다.
//       (클라이언트 컴포넌트가 이 배럴을 import 할 때 서버 모듈이 끌려가지 않도록 분리)
export { bookApi } from './api/bookApi';

// 독서 달력 한 달치 (서재 연도 뷰)
export type {
  CalendarCompletion,
  CalendarDay,
  CalendarMonth,
  CalendarRangeSegment,
} from './model/calendarMonth';
export {
  buildCalendarMonth,
  getInitialCalendarMonth,
  MAX_LANES,
} from './model/calendarMonth';
export { readingDayCount, readingSince } from './model/readingSince';

// 표지 주소 — YES24 가 먼저, Storage 사본은 대체용
export type { CoverSource } from './model/coverSource';
export { toCoverSource } from './model/coverSource';

// 재독 기록 합치기 — 같은 책의 회독이 책장에 여러 번 서지 않게 한다
export { dedupeReadings } from './model/dedupeReadings';

// 서재 기간 분류·통계 (서버에서 받은 책 목록을 클라이언트에서도 재사용)
export {
  calculateBookStats,
  filterBooksByLibraryYear,
  getBookLibraryYear,
  getCurrentLibraryYear,
  getLibraryYears,
  getSeoulToday,
  resolveDefaultLibraryYear,
} from './model/libraryPeriod';

// 평점 의미 (0 = 평가 안 함) — 판정과 평균 계산의 유일한 출처.
// 인생책은 rating 이 아니라 별도 컬럼(is_life_book)이다.
export {
  averageScore,
  isRated,
  isTopRated,
  RATING_MAX,
  summarizeRatings,
} from './model/rating';

// 목표 대비 속도 · 분야 균형 (서재 연도 뷰)
export type { BalanceCategory, ReadingBalance } from './model/readingBalance';
export {
  BALANCE_CATEGORIES,
  calculateReadingBalance,
} from './model/readingBalance';
export type { ReadingPace, ReadingPaceState } from './model/readingPace';
export { getReadingPace, resolveGoalTarget } from './model/readingPace';
