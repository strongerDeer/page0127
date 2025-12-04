import { apiClient } from '@/shared/api/client';

import type { Book, BookInput } from '../types';

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
   * 목록 조회
   * GET /api/books?status=reading
   */
  getBooks: async (status?: string): Promise<Book[]> => {
    const params = status ? { status } : {};
    const response = await apiClient.get<Book[]>('/books', { params });
    return response.data;
  },

  /**
   * 상세 조회
   * GET /api/books/:id
   */
  getBookById: async (id: string): Promise<Book> => {
    const response = await apiClient.get<Book>(`/books/${id}`);
    return response.data;
  },

  /**
   * 생성
   * POST /api/books
   */
  createBook: async (bookData: BookInput): Promise<Book> => {
    const response = await apiClient.post<Book>('/books', bookData);
    return response.data;
  },

  /**
   * 수정
   * PATCH /api/books/:id
   */
  updateBook: async (
    id: string,
    updates: Partial<BookInput>
  ): Promise<Book> => {
    const response = await apiClient.patch<Book>(`/books/${id}`, updates);
    return response.data;
  },

  /**
   * 삭제
   * DELETE /api/books/:id
   */
  deleteBook: async (id: string): Promise<void> => {
    await apiClient.delete(`/books/${id}`);
  },
};
