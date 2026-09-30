import { yes24Provider } from './yes24';

import type { BookProvider } from './types';

export type {
  BookProvider,
  BookSource,
  ProviderBook,
  ProviderSearchResult,
  SearchOptions,
} from './types';
export { BOOK_SOURCES } from './types';
export {
  buildYes24BackUrl,
  buildYes24CoverUrl,
  buildYes24SpineUrl,
  isYes24PlaceholderImage,
} from './yes24Image';

/**
 * 도서 공급자 선택 — 교체 지점은 여기 한 곳이다.
 *
 * 지금은 YES24 하나뿐이다. 알라딘 OpenAPI 는 2026-10-30 종료가 예정돼 있어
 * YES24 전환을 마친 뒤 걷어냈다.
 *
 * 학습 포인트:
 * - 공급자가 하나여도 함수 뒤에 숨겨 두는 이유: 호출처(검색·상세·취향분석 라우트)는
 *   누가 답하는지 모른다. 다음 공급자 교체도 이 함수 한 곳만 바꾸면 된다.
 */
export const getBookProvider = (): BookProvider => yes24Provider;
