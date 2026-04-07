'use client';

import { useState } from 'react';

import { bookApi } from '@/entities/book/api/bookApi';

import type { Book, BookInput } from '@/entities/book/types';

/**
 * 도서 CRUD Custom Hook
 *
 * 학습 포인트:
 * - axios + API Route로 CRUD 작업
 * - TypeScript 타입 안전성
 * - 에러 핸들링
 * - 로딩 상태 관리
 */
export const useBookCRUD = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * C: 도서 추가
   */
  const createBook = async (bookData: BookInput): Promise<Book | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await bookApi.createBook(bookData);
      return data;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '도서 추가 중 오류가 발생했습니다.';
      setError(message);
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * R: 내 도서 목록 조회
   */
  const getMyBooks = async (
    status?: string,
    sortBy?: string,
    order?: 'asc' | 'desc'
  ): Promise<Book[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await bookApi.getBooks(status, sortBy, order);
      return data;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '도서 목록 조회 중 오류가 발생했습니다.';
      setError(message);
      console.error(err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * R: 도서 상세 조회
   * useCallback 불필요: 이 함수를 useEffect 의존성 배열에 넣는 곳이 없다.
   * useCallback이 필요한 경우는 "이 함수가 useEffect deps에 들어가거나,
   * React.memo로 감싼 자식 컴포넌트에 props로 전달될 때"뿐이다.
   */
  const getBookById = async (id: string): Promise<Book | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await bookApi.getBookById(id);
      return data;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '도서 조회 중 오류가 발생했습니다.';
      setError(message);
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * U: 도서 정보 수정
   */
  const updateBook = async (
    id: string,
    updates: Partial<BookInput>
  ): Promise<Book | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await bookApi.updateBook(id, updates);
      return data;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '도서 수정 중 오류가 발생했습니다.';
      setError(message);
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * D: 도서 삭제
   */
  const deleteBook = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await bookApi.deleteBook(id);
      return true;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : '도서 삭제 중 오류가 발생했습니다.';
      setError(message);
      console.error(err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * R: ISBN으로 책 검색 (중복 등록 체크용)
   */
  const getBookByISBN = async (isbn: string): Promise<Book[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await bookApi.getBookByISBN(isbn);
      return data;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'ISBN 검색 중 오류가 발생했습니다.';
      setError(message);
      console.error(err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    createBook,
    getMyBooks,
    getBookById,
    getBookByISBN,
    updateBook,
    deleteBook,
  };
};
