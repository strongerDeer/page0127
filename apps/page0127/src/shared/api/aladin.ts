import type {
  AladinSearchResponse,
  AladinLookUpResponse,
} from '@/shared/types/aladin';

/**
 * 알라딘 API 도서 검색
 *
 * 학습 포인트:
 * - CORS 문제 해결: Next.js API Route를 통해 서버에서 호출
 * - URLSearchParams로 쿼리 파라미터 생성
 * - fetch API 사용
 */
export const searchBooks = async (
  query: string,
  options?: {
    page?: number;
    maxResults?: number;
  }
): Promise<AladinSearchResponse> => {
  const { page = 1, maxResults = 10 } = options || {};

  // Next.js API Route 호출 (서버에서 알라딘 API 호출)
  const params = new URLSearchParams({
    query,
    page: String(page),
    maxResults: String(maxResults),
  });

  const url = `/api/books/search?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    const data: AladinSearchResponse = await response.json();
    return data;
  } catch (error) {
    console.error('도서 검색 실패:', error);
    throw error;
  }
};

/**
 * 알라딘 API 도서 상세 정보 조회 (ItemLookUp)
 *
 * 학습 포인트:
 * - AI 분석을 위한 목차(toc), 전체 소개(fullDescription) 조회
 * - ISBN으로 상세 정보 조회
 */
export const getBookDetail = async (isbn: string): Promise<AladinLookUpResponse> => {
  // Next.js API Route 호출
  const url = `/api/books/detail?isbn=${isbn}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    const data: AladinLookUpResponse = await response.json();
    return data;
  } catch (error) {
    console.error('도서 상세 정보 조회 실패:', error);
    throw error;
  }
};
