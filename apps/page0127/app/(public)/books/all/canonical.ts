/**
 * /books/all 의 canonical 주소를 searchParams 로부터 정한다.
 *
 * 왜 페이지마다 다른가:
 * 예전에는 모든 페이지가 canonical 을 `/books/all`(1페이지)로 적었다.
 * 그러면 검색엔진은 2페이지 이후를 "1페이지의 사본"으로 보고, 그 안에 있는
 * 책 정보 링크(/books/info/[id])를 덜 따라간다. 목록 페이지는 각자 다른 책을
 * 담고 있으므로 자기 주소를 canonical 로 적는 것이 맞다(Google 페이지네이션 권장).
 *
 * 규칙:
 * - 1페이지(또는 잘못된 page 값)   → `/books/all`
 * - 2페이지 이상                   → `/books/all?page=N`
 * - 정렬(sort·order)               → 버린다. 같은 책을 순서만 바꾼 사본이라
 *                                    기본 정렬 주소 하나로 모은다.
 * - 검색어(q)가 있으면             → `/books/all`. 검색 결과는 색인 대상이 아니다.
 */
export type BooksAllSearchParams = {
  [key: string]: string | string[] | undefined;
};

const BASE_PATH = '/books/all';

export const getBooksAllCanonical = (
  searchParams: BooksAllSearchParams
): string => {
  const q = typeof searchParams.q === 'string' ? searchParams.q.trim() : '';
  if (q) return BASE_PATH;

  // 배열(?page=2&page=3)이면 첫 값만 본다 — 본문 쿼리와 같은 방식으로 정수만 인정
  const rawPage = Array.isArray(searchParams.page)
    ? searchParams.page[0]
    : searchParams.page;
  const page = Number(rawPage);
  if (!Number.isInteger(page) || page < 2) return BASE_PATH;

  return `${BASE_PATH}?page=${page}`;
};
