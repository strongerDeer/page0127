import { describe, expect, it } from 'vitest';

import { MAX_CACHED_CATALOG_PAGE, toCatalogCacheKey } from './catalogPageCache';

const base = {
  isLoggedIn: false,
  q: '',
  page: 1,
  sort: 'created_at',
  order: 'desc',
  limit: 20,
};

describe('toCatalogCacheKey', () => {
  it('비로그인·검색 없음·기본 정렬 1페이지는 캐시 키를 만든다', () => {
    expect(toCatalogCacheKey(base)).toEqual({
      page: 1,
      sort: 'created_at',
      order: 'desc',
      limit: 20,
    });
  });

  it('제목순(정렬 버튼이 만드는 값)도 캐시한다', () => {
    expect(
      toCatalogCacheKey({ ...base, sort: 'title', order: 'asc' })
    ).not.toBeNull();
  });

  it('로그인 사용자는 캐시하지 않는다 — 내가 직접 등록한 책이 목록에 섞인다', () => {
    expect(toCatalogCacheKey({ ...base, isLoggedIn: true })).toBeNull();
  });

  it('검색어가 있으면 캐시하지 않는다', () => {
    expect(toCatalogCacheKey({ ...base, q: '데미안' })).toBeNull();
  });

  it('정렬 버튼에 없는 정렬값은 캐시 키로 받지 않는다', () => {
    expect(toCatalogCacheKey({ ...base, sort: 'author' })).toBeNull();
    expect(toCatalogCacheKey({ ...base, order: 'sideways' })).toBeNull();
  });

  it(`앞쪽 ${MAX_CACHED_CATALOG_PAGE}페이지 밖이나 이상한 페이지 번호는 캐시하지 않는다`, () => {
    expect(
      toCatalogCacheKey({ ...base, page: MAX_CACHED_CATALOG_PAGE })
    ).not.toBeNull();
    expect(
      toCatalogCacheKey({ ...base, page: MAX_CACHED_CATALOG_PAGE + 1 })
    ).toBeNull();
    expect(toCatalogCacheKey({ ...base, page: 0 })).toBeNull();
    expect(toCatalogCacheKey({ ...base, page: 1.5 })).toBeNull();
  });
});
