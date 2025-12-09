'use client';

import { useState } from 'react';

import Link from 'next/link';

import { mapToMainCategory } from '@/shared/lib/categoryMapper';
import { Button } from '@/shared/ui/button';

import { CategoryFilter } from './CategoryFilter';

import type { Book } from '@/entities/book/types';
import type { CategoryReadingData } from '@/entities/book/types/stats';

type DashboardBookListProps = {
  /** 완독한 책 목록 */
  books: Book[];

  /** 카테고리별 독서량 */
  categories: CategoryReadingData[];

  /** 선택된 월 (1-12, null = 전체) */
  selectedMonth: number | null;

  /** 선택된 카테고리 */
  selectedCategory: string | null;

  /** 선택된 평점 (1-5, null = 전체) */
  selectedRating: number | null;

  /** 카테고리 선택 핸들러 */
  onCategoryChange: (category: string | null) => void;

  /** 월 필터 제거 핸들러 */
  onRemoveMonthFilter: () => void;

  /** 평점 필터 제거 핸들러 */
  onRemoveRatingFilter: () => void;
};

/**
 * 대시보드 책 목록 섹션 (Client Component)
 *
 * 학습 포인트:
 * - 월별 + 카테고리 + 평점 복합 필터링
 * - 부모 컴포넌트에서 상태 관리 (lift state up)
 * - 필터 뱃지로 현재 필터 표시
 * - 책 표지 그리드 레이아웃
 */
export const DashboardBookList = ({
  books,
  categories,
  selectedMonth,
  selectedCategory,
  selectedRating,
  onCategoryChange,
  onRemoveMonthFilter,
  onRemoveRatingFilter,
}: DashboardBookListProps) => {
  const BOOKS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  // 월별 + 카테고리 + 평점 복합 필터 적용
  const filteredBooks = books.filter((book) => {
    // 1. 월 필터 확인
    if (selectedMonth !== null && book.completed_date) {
      const completedDate = new Date(book.completed_date);
      const bookMonth = completedDate.getMonth() + 1; // 0-11 → 1-12
      if (bookMonth !== selectedMonth) return false;
    }

    // 2. 카테고리 필터 확인
    if (selectedCategory !== null) {
      const mainCategory = mapToMainCategory(book.category);
      if (mainCategory !== selectedCategory) return false;
    }

    // 3. 평점 필터 확인
    if (selectedRating !== null) {
      if (book.rating !== selectedRating) return false;
    }

    return true;
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredBooks.length / BOOKS_PER_PAGE);
  const startIndex = (currentPage - 1) * BOOKS_PER_PAGE;
  const endIndex = startIndex + BOOKS_PER_PAGE;
  const paginatedBooks = filteredBooks.slice(startIndex, endIndex);

  // 필터 변경 시 첫 페이지로 이동
  const handleCategoryChange = (category: string | null) => {
    setCurrentPage(1);
    onCategoryChange(category);
  };

  const handleRemoveMonthFilter = () => {
    setCurrentPage(1);
    onRemoveMonthFilter();
  };

  return (
    <div>
      {/* 활성 필터 뱃지 */}
      {(selectedMonth !== null ||
        selectedCategory !== null ||
        selectedRating !== null) && (
        <div className='mb-4 flex flex-wrap items-center gap-2'>
          <span className='text-sm font-medium text-gray-600'>활성 필터:</span>
          {selectedMonth !== null && (
            <button
              onClick={handleRemoveMonthFilter}
              className='flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200'
            >
              {selectedMonth}월 <span className='font-bold'>✕</span>
            </button>
          )}
          {selectedCategory !== null && (
            <button
              onClick={() => handleCategoryChange(null)}
              className='flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700 hover:bg-emerald-200'
            >
              {selectedCategory} <span className='font-bold'>✕</span>
            </button>
          )}
          {selectedRating !== null && (
            <button
              onClick={onRemoveRatingFilter}
              className='flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700 hover:bg-amber-200'
            >
              {selectedRating}점 ⭐ <span className='font-bold'>✕</span>
            </button>
          )}
        </div>
      )}

      {/* 카테고리 필터 */}
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategoryChange}
      />

      {/* 읽은 책 목록 */}
      <div>
        <div className='mb-4 flex items-center justify-between'>
          <h3 className='text-lg font-semibold'>
            읽은 책 ({filteredBooks.length})
          </h3>
          <Link
            href='/books?status=completed'
            className='text-sm text-emerald-600 hover:text-emerald-700'
          >
            전체 보기 →
          </Link>
        </div>

        {/* 책 표지 그리드 */}
        {filteredBooks.length > 0 ? (
          <>
            <div className='grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'>
              {paginatedBooks.map((book) => (
                <Link
                  key={book.id}
                  href={`/books/${book.id}`}
                  className='group transition-transform hover:scale-105'
                >
                  <div className='aspect-2/3 overflow-hidden rounded-lg bg-gray-100 shadow-md'>
                    {book.cover_image ? (
                      <img
                        src={book.cover_image}
                        alt={book.title}
                        className='h-full w-full object-cover'
                      />
                    ) : (
                      <div className='flex h-full w-full items-center justify-center text-4xl'>
                        📚
                      </div>
                    )}
                  </div>
                  <p className='mt-2 line-clamp-2 text-xs text-gray-700 group-hover:text-emerald-600'>
                    {book.title}
                  </p>
                </Link>
              ))}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className='mt-6 flex items-center justify-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                >
                  이전
                </Button>
                <div className='flex gap-1'>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => setCurrentPage(page)}
                        className='min-w-[40px]'
                      >
                        {page}
                      </Button>
                    )
                  )}
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  다음
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className='rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center'>
            <div className='mx-auto mb-2 text-4xl'>🔍</div>
            <p className='text-sm text-gray-500'>
              {selectedCategory
                ? `${selectedCategory} 카테고리의 책이 없습니다`
                : '완독한 책이 없습니다'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
