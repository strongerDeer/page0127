'use client';

import { useState } from 'react';

import { searchBooks } from '@/shared/api/aladin';

import type { AladinBook } from '@/entities/book/types';

/**
 * 도서 검색 Custom Hook
 *
 * 학습 포인트:
 * - useState로 로딩/에러/데이터 상태 관리
 * - async/await 패턴
 * - 에러 핸들링
 * - 페이지네이션: 페이지별 데이터 관리 (누적이 아닌 교체 방식)
 */
export const useBookSearch = () => {
  const [books, setBooks] = useState<AladinBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [currentQuery, setCurrentQuery] = useState('');

  const ITEMS_PER_PAGE = 10;

  const search = async (query: string, page = 1) => {
    if (!query.trim()) {
      setBooks([]);
      setCurrentPage(1);
      setTotalResults(0);
      setCurrentQuery('');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentQuery(query);
    setCurrentPage(page);

    try {
      const response = await searchBooks(query, {
        page,
        maxResults: ITEMS_PER_PAGE,
      });
      const items = response.item || [];
      setBooks(items);
      setTotalResults(response.totalResults);
    } catch (err) {
      setError('도서 검색 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const goToPage = (page: number) => {
    if (currentQuery) {
      search(currentQuery, page);
    }
  };

  return {
    books,
    isLoading,
    error,
    currentPage,
    totalResults,
    itemsPerPage: ITEMS_PER_PAGE,
    search,
    goToPage,
  };
};
