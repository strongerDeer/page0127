'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

import { useBookCRUD } from '@/features/book/api/useBookCRUD';
import { useBookSearch } from '@/features/book/api/useBookSearch';
import {
  type BookFormData,
  BookRegistrationForm,
} from '@/features/book/ui/BookRegistrationForm';
import { BookSearchInput } from '@/features/book/ui/BookSearchInput';
import { BookSearchPagination } from '@/features/book/ui/BookSearchPagination';
import { BookSearchResultCard } from '@/features/book/ui/BookSearchResultCard';

import type { AladinBook } from '@/entities/book/types';

/**
 * 도서 추가 페이지
 *
 * 학습 포인트:
 * - 여러 Custom Hook 조합하여 사용
 * - 단계별 UI 전환 (검색 → 등록 폼)
 * - 성공 시 페이지 이동
 * - Error Boundary로 에러 처리
 */
const AddBookPage = () => {
  const router = useRouter();
  const {
    books,
    isLoading: isSearching,
    search,
    goToPage,
    currentPage,
    totalResults,
    itemsPerPage,
  } = useBookSearch();
  const { createBook, isLoading: isCreating } = useBookCRUD();

  const [selectedBook, setSelectedBook] = useState<AladinBook | null>(null);

  const handleSelectBook = (book: AladinBook) => {
    setSelectedBook(book);
  };

  const handleSubmit = async (formData: BookFormData) => {
    if (!selectedBook) return;

    // 알라딘 도서 정보 + 사용자 입력 데이터 결합
    const bookData = {
      isbn: selectedBook.isbn13,
      title: selectedBook.title,
      author: selectedBook.author,
      publisher: selectedBook.publisher,
      cover_image: selectedBook.cover,
      description: selectedBook.description,
      pub_date: selectedBook.pubDate,
      category: selectedBook.categoryName,
      ...formData,
    };

    const result = await createBook(bookData);

    if (result) {
      toast.success('도서가 등록되었습니다!');
      router.push('/books'); // 도서 목록 페이지로 이동
    } else {
      toast.error('도서 등록에 실패했습니다.');
    }
  };

  const handleCancel = () => {
    setSelectedBook(null);
  };

  return (
    <ErrorBoundary>
      <div className='min-h-screen bg-gray-50 p-8'>
        <div className='mx-auto max-w-4xl'>
          <h1 className='mb-6 text-3xl font-bold'>도서 추가</h1>

          {/* 등록 폼이 열려있지 않을 때만 검색 UI 표시 */}
          {!selectedBook ? (
            <div className='space-y-6'>
              {/* 검색 입력 */}
              <BookSearchInput onSearch={search} isLoading={isSearching} />

              {/* 로딩 상태 */}
              {isSearching && (
                <p className='text-center text-gray-500'>검색 중...</p>
              )}

              {/* 검색 결과 */}
              {!isSearching && books.length > 0 && (
                <div className='space-y-4'>
                  <p className='text-sm text-gray-600'>
                    총 {totalResults}개 중 {books.length}개 표시
                  </p>
                  {books.map((book) => (
                    <BookSearchResultCard
                      key={book.isbn13}
                      book={book}
                      onSelect={handleSelectBook}
                    />
                  ))}

                  {/* Pagination */}
                  {totalResults > itemsPerPage && (
                    <BookSearchPagination
                      currentPage={currentPage}
                      totalResults={totalResults}
                      itemsPerPage={itemsPerPage}
                      onPageChange={goToPage}
                    />
                  )}
                </div>
              )}

              {/* 검색 결과 없음 */}
              {!isSearching && books.length === 0 && (
                <p className='text-center text-gray-500'>
                  도서 제목을 검색해주세요
                </p>
              )}
            </div>
          ) : (
            /* 등록 폼 */
            <BookRegistrationForm
              book={selectedBook}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isCreating}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default AddBookPage;
