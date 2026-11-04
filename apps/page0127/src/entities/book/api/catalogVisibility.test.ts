import { describe, expect, it } from 'vitest';

import { catalogVisibilityFilter } from './catalogVisibility';

describe('catalogVisibilityFilter', () => {
  it('비로그인·남에게는 서점 책만 — source 가 빈 옛 행도 남긴다', () => {
    expect(catalogVisibilityFilter()).toBe('source.is.null,source.neq.manual');
    expect(catalogVisibilityFilter(null)).toBe(
      'source.is.null,source.neq.manual'
    );
  });

  it('로그인하면 내가 등록한 직접 등록 책까지', () => {
    expect(catalogVisibilityFilter('u1')).toBe(
      'source.is.null,source.neq.manual,submitted_by.eq.u1'
    );
  });
});
