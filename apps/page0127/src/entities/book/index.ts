// entities/book public API
// 외부 슬라이스/레이어는 항상 '@/entities/book'을 통해 import 한다
// 내부 폴더 구조(types/, api/, model/)는 외부에 노출하지 않는다

// 도메인 타입
export type {
  AladinBook,
  AladinSearchResponse,
  Book,
  BookInput,
  BookRanking,
  BookRating,
  BookStats,
  BookStatus,
  GlobalBook,
} from './types';

// 통계 도메인 타입
export type {
  CategoryDistribution,
  CategoryReadingData,
  MonthlyReadingData,
  OverallStats,
  RatingDistribution,
  RatingReadingData,
  ReadingJourney,
  YearlyTrend,
} from './types/stats';

// 데이터 페칭 API
export { bookApi } from './api/bookApi';
export { getBookStats } from './api/getBookStats';
export { getAvailableYears, getMyBooks } from './api/getMyBooks';
export { getOverallStats } from './api/getOverallStats';

// TanStack Query 키
export { bookKeys } from './model/queryKeys';
