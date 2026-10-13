import { describe, expect, it } from 'vitest';

import { hasActiveShelfFilter } from './useLibraryFilters';

describe('hasActiveShelfFilter', () => {
  const none = {
    selectedCategories: [],
    selectedRating: null,
    searchQuery: '',
  };

  it('아무 조건도 없으면 false — 이때만 읽는 중 책을 선반 끝에 꽂는다', () => {
    expect(hasActiveShelfFilter(none)).toBe(false);
    expect(hasActiveShelfFilter({ ...none, searchQuery: '   ' })).toBe(false);
  });

  it('분야·평점·검색어 중 하나라도 있으면 true', () => {
    expect(
      hasActiveShelfFilter({ ...none, selectedCategories: ['에세이'] })
    ).toBe(true);
    expect(hasActiveShelfFilter({ ...none, selectedRating: 'life' })).toBe(
      true
    );
    expect(hasActiveShelfFilter({ ...none, searchQuery: '모순' })).toBe(true);
  });
});
