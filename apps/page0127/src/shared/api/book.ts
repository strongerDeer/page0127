import type { ProviderBook, ProviderSearchResult } from '@/shared/api/book-provider';

/**
 * 도서 검색·상세 조회 (클라이언트에서 호출)
 *
 * 학습 포인트:
 * - CORS와 API 키 노출을 함께 피하려고 Next.js API Route를 한 번 거친다
 * - 어느 공급자가 답하는지는 서버가 정한다 — 화면은 `ProviderBook` 한 가지만 안다
 */

export const searchBooks = async (
  query: string,
  options?: { page?: number; maxResults?: number }
): Promise<ProviderSearchResult> => {
  const { page = 1, maxResults = 10 } = options || {};

  const params = new URLSearchParams({
    query,
    page: String(page),
    maxResults: String(maxResults),
  });

  const response = await fetch(`/api/books/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`API 오류: ${response.status}`);
  }

  return (await response.json()) as ProviderSearchResult;
};

/**
 * ISBN13으로 상세 정보를 가져온다. 해당 책이 없으면 `null`.
 *
 * 라우트가 "없음"을 204로 답하므로 본문을 읽기 전에 상태를 먼저 본다 —
 * 204에 `response.json()`을 걸면 파싱 에러가 난다.
 */
export const getBookDetail = async (
  isbn: string
): Promise<ProviderBook | null> => {
  const response = await fetch(`/api/books/detail?isbn=${isbn}`);

  if (response.status === 204) return null;

  if (!response.ok) {
    throw new Error(`API 오류: ${response.status}`);
  }

  return (await response.json()) as ProviderBook;
};
