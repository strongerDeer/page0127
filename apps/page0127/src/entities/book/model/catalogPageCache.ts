/**
 * 전체 도서(/books/all) 캐시 규칙 — 서버 전용 코드와 분리해 테스트할 수 있게 둔다.
 */

export { BOOKS_ALL_CACHE_TAG } from '@/shared/lib/cache/cacheTags';

/**
 * 캐시해 두는 페이지 수 상한. 그 뒤 페이지는 거의 열리지 않으니 매번 조회한다.
 * 상한이 없으면 ?page=99999 같은 주소마다 캐시 항목이 하나씩 쌓인다.
 */
export const MAX_CACHED_CATALOG_PAGE = 20;

export type CatalogSort = 'created_at' | 'title';
export type CatalogOrder = 'asc' | 'desc';

export type CatalogPageKey = {
  page: number;
  sort: CatalogSort;
  order: CatalogOrder;
  limit: number;
};

/**
 * 이 요청을 캐시된 목록으로 줄 수 있으면 키를, 아니면 null 을 돌려준다.
 *
 * 캐시하지 않는 경우:
 * - 로그인: 내가 직접 등록한 책이 목록에 섞이고(catalogVisibility), 읽음·좋아요 표시도 나만의 것
 * - 검색어(q): 조합이 끝없이 많다
 * - 화면의 정렬 버튼이 만들지 않는 정렬값: 지금도 그대로 DB 에 넘기지만, 캐시 키로는 받지 않는다
 * - 앞쪽 20페이지 밖
 */
export const toCatalogCacheKey = ({
  isLoggedIn,
  q,
  page,
  sort,
  order,
  limit,
}: {
  isLoggedIn: boolean;
  q: string;
  page: number;
  sort: string;
  order: string;
  limit: number;
}): CatalogPageKey | null => {
  if (isLoggedIn || q) return null;
  if (sort !== 'created_at' && sort !== 'title') return null;
  if (order !== 'asc' && order !== 'desc') return null;
  if (!Number.isInteger(page) || page < 1 || page > MAX_CACHED_CATALOG_PAGE) {
    return null;
  }
  return { page, sort, order, limit };
};
