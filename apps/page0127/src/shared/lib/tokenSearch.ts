import { quotePostgrestValue } from './postgrestFilter';

/** 검색어를 이 개수까지만 단어로 쓴다 — 단어마다 조건이 하나씩 붙으므로 쿼리 길이를 제한한다. */
export const MAX_SEARCH_TOKENS = 5;

/**
 * 검색어를 단어로 나눈다. 공백과 쉼표를 구분자로 보고, 같은 단어(대소문자 무시)는 한 번만 쓴다.
 *
 * 왜 쉼표도 구분자인가:
 * "세네카, 오늘을" 처럼 제목을 통째로 붙여 넣어도, "세네카 오늘을" 처럼 쉼표를 빼고 쳐도
 * 같은 결과가 나와야 한다. 쉼표를 지워 버리면(예전 방식) 붙여 넣은 제목이 DB 제목과 한 글자 달라져 0건이 된다.
 */
export const tokenizeSearch = (search: string): string[] => {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const raw of search.split(/[\s,]+/)) {
    const token = raw.slice(0, 100);
    const key = token.toLowerCase();
    if (!token || seen.has(key)) continue;
    seen.add(key);
    tokens.push(token);
    if (tokens.length === MAX_SEARCH_TOKENS) break;
  }
  return tokens;
};

/**
 * 단어마다 "이 컬럼들 중 하나에 포함" 조건을 만든다.
 * 예) ('세네카 오늘', ['title','author'])
 *   → ['title.ilike."%세네카%",author.ilike."%세네카%"', 'title.ilike."%오늘%",author.ilike."%오늘%"']
 */
export const buildTokenSearchFilters = (
  search: string,
  columns: readonly string[]
): string[] =>
  tokenizeSearch(search).map((token) => {
    const pattern = quotePostgrestValue(`%${token}%`);
    return columns.map((column) => `${column}.ilike.${pattern}`).join(',');
  });

/**
 * Supabase 쿼리에 단어별 검색을 건다. 모든 단어가 (columns 중 어딘가에) 들어간 행만 남는다.
 *
 * 동작 원리:
 * supabase-js 에서 `.or()` 를 여러 번 이으면 각 `.or()` 사이는 AND 로 묶인다.
 * 그래서 단어마다 `.or(title ilike 단어, author ilike 단어)` 를 이으면
 * "세네카 오늘" → (제목·저자에 '세네카') AND (제목·저자에 '오늘') 이 된다.
 * 단어는 quotePostgrestValue 로 감싸므로 쉼표·괄호를 넣어도 조건이 늘어나지 않는다(필터 주입 방지).
 */
export const applyTokenSearch = <Q extends { or(filters: string): Q }>(
  query: Q,
  search: string,
  columns: readonly string[]
): Q =>
  buildTokenSearchFilters(search, columns).reduce(
    (acc, filter) => acc.or(filter),
    query
  );
