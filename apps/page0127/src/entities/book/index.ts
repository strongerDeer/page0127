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

// 데이터 페칭 API (클라이언트 안전)
// 주의: next/headers 에 의존하는 서버 전용 함수는 './server' 에서 별도로 export 한다.
//       (클라이언트 컴포넌트가 이 배럴을 import 할 때 서버 모듈이 끌려가지 않도록 분리)
export { bookApi } from './api/bookApi';

// TanStack Query 키
export { bookKeys } from './model/queryKeys';
