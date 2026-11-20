import { describe, expect, it } from 'vitest';

import {
  applyTokenSearch,
  buildTokenSearchFilters,
  MAX_SEARCH_TOKENS,
  tokenizeSearch,
} from './tokenSearch';

describe('tokenizeSearch', () => {
  it('쉼표가 든 제목을 붙여 넣어도 단어로 나눈다', () => {
    expect(tokenizeSearch('세네카, 오늘을 빼앗기고 있는 당신에게')).toEqual([
      '세네카',
      '오늘을',
      '빼앗기고',
      '있는',
      '당신에게',
    ]);
  });

  it('쉼표를 뺀 입력과 같은 단어가 나온다', () => {
    expect(tokenizeSearch('세네카 오늘을')).toEqual(
      tokenizeSearch('세네카,오늘을')
    );
  });

  it('빈 칸·중복(대소문자 무시)은 버린다', () => {
    expect(tokenizeSearch('  Harry  harry, ,potter ')).toEqual([
      'Harry',
      'potter',
    ]);
    expect(tokenizeSearch('   ')).toEqual([]);
  });

  it(`단어는 ${MAX_SEARCH_TOKENS}개까지만 쓴다`, () => {
    expect(tokenizeSearch('a b c d e f g')).toHaveLength(MAX_SEARCH_TOKENS);
  });
});

describe('buildTokenSearchFilters', () => {
  it('단어마다 컬럼 OR 조건을 만들고 값을 따옴표로 감싼다', () => {
    expect(buildTokenSearchFilters('세네카 오늘', ['title', 'author'])).toEqual(
      [
        'title.ilike."%세네카%",author.ilike."%세네카%"',
        'title.ilike."%오늘%",author.ilike."%오늘%"',
      ]
    );
  });

  it('괄호·따옴표를 넣어도 조건이 늘어나지 않는다', () => {
    expect(buildTokenSearchFilters('x)and(a.eq.1"', ['title'])).toEqual([
      'title.ilike."%x)and(a.eq.1\\"%"',
    ]);
  });
});

describe('applyTokenSearch', () => {
  it('단어 수만큼 .or() 를 이어 붙인다(사이는 AND)', () => {
    const calls: string[] = [];
    const fake = {
      or(filters: string) {
        calls.push(filters);
        return fake;
      },
    };
    applyTokenSearch(fake, '세네카, 오늘을', ['title']);
    expect(calls).toEqual(['title.ilike."%세네카%"', 'title.ilike."%오늘을%"']);
  });

  it('검색어가 비면 쿼리를 그대로 둔다', () => {
    const fake = {
      or: () => {
        throw new Error('호출되면 안 됨');
      },
    };
    expect(applyTokenSearch(fake, ' ', ['title'])).toBe(fake);
  });
});
