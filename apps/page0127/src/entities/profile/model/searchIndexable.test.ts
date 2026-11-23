import { describe, expect, it } from 'vitest';

import { isSearchIndexable, libraryRobots } from './searchIndexable';

describe('isSearchIndexable', () => {
  it('기본은 노출한다 (값이 없어도)', () => {
    expect(isSearchIndexable({ search_indexable: true })).toBe(true);
    expect(isSearchIndexable({})).toBe(true);
  });

  it('직접 끈 경우에만 숨긴다', () => {
    expect(isSearchIndexable({ search_indexable: false })).toBe(false);
  });
});

describe('libraryRobots', () => {
  it('노출이면 robots 를 덧붙이지 않는다 (루트 기본값을 따른다)', () => {
    expect(libraryRobots({ search_indexable: true })).toEqual({});
  });

  it('끄면 noindex, follow', () => {
    expect(libraryRobots({ search_indexable: false })).toEqual({
      robots: { index: false, follow: true },
    });
  });
});
