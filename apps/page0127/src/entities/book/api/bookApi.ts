import { apiClient } from '@/shared/api/client';
import { API_ENDPOINTS } from '@/shared/config/endpoints';

import type { Book, BookInput, BookStats } from '../types';

/**
 * 책 관련 API 함수 모음
 *
 * 학습 포인트:
 * - RESTful API 패턴: GET, POST, PATCH, DELETE
 * - TypeScript 제네릭으로 타입 안전성 보장
 * - response.data로 실제 데이터만 반환
 */
export const bookApi = {
  /**
   * C: 생성
   * POST /api/books
   */
  createBook: async (bookData: BookInput): Promise<Book> => {
    const response = await apiClient.post<Book>(
      API_ENDPOINTS.books.create,
      bookData
    );
    return response.data;
  },

  /**
   * R: 목록 조회
   * GET /api/books?status=reading&sortBy=created_at&order=desc
   */
  getBooks: async (
    status?: string,
    sortBy?: string,
    order?: 'asc' | 'desc'
  ): Promise<Book[]> => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (sortBy) params.sortBy = sortBy;
    if (order) params.order = order;

    const response = await apiClient.get<Book[]>(API_ENDPOINTS.books.list, {
      params,
    });
    return response.data;
  },

  /**
   * R: ISBN으로 책 검색 (중복 등록 체크용)
   * GET /api/books?isbn=9788...
   */
  getBookByISBN: async (isbn: string): Promise<Book[]> => {
    const response = await apiClient.get<Book[]>(API_ENDPOINTS.books.list, {
      params: { isbn },
    });
    return response.data;
  },

  /**
   * R: 상세 조회
   * GET /api/books/:id
   */
  getBookById: async (id: string): Promise<Book> => {
    const response = await apiClient.get<Book>(API_ENDPOINTS.books.detail(id));
    return response.data;
  },

  /**
   * U: 수정
   * PATCH /api/books/:id
   */
  updateBook: async (
    id: string,
    updates: Partial<BookInput>
  ): Promise<Book> => {
    const response = await apiClient.patch<Book>(
      API_ENDPOINTS.books.update(id),
      updates
    );
    return response.data;
  },

  /**
   * D: 삭제
   * DELETE /api/books/:id
   */
  deleteBook: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.books.delete(id));
  },

  /**
   * 통계 조회
   * GET /api/books/stats
   */
  getBookStats: async (): Promise<BookStats> => {
    const response = await apiClient.get<BookStats>(API_ENDPOINTS.books.stats);
    return response.data;
  },
};
