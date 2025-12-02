'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/shared/ui/pagination';

import { useBookCRUD } from '@/features/book/api/useBookCRUD';
import { useBookSearch } from '@/features/book/api/useBookSearch';
import {
  type BookFormData,
  BookRegistrationForm,
} from '@/features/book/ui/BookRegistrationForm';
import { BookSearchInput } from '@/features/book/ui/BookSearchInput';
import { BookSearchResultCard } from '@/features/book/ui/BookSearchResultCard';

import type { AladinBook } from '@/entities/book/types';

/**
 * 도서 추가 페이지
 *
 * 학습 포인트:
 * - 여러 Custom Hook 조합하여 사용
 * - 단계별 UI 전환 (검색 → 등록 폼)
 * - 성공 시 페이지 이동
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
      alert('도서가 등록되었습니다!');
      router.push('/books'); // 도서 목록 페이지로 이동
    }
  };

  const handleCancel = () => {
    setSelectedBook(null);
  };

  return (
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
                  <div className='flex justify-center pt-6'>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => goToPage(currentPage - 1)}
                            className={
                              currentPage === 1
                                ? 'pointer-events-none opacity-50'
                                : 'cursor-pointer'
                            }
                          />
                        </PaginationItem>

                        {/* 페이지 번호 */}
                        {Array.from(
                          {
                            length: Math.ceil(totalResults / itemsPerPage),
                          },
                          (_, i) => i + 1
                        )
                          .filter((page) => {
                            // 현재 페이지 기준 앞뒤 2개씩만 표시
                            return (
                              page === 1 ||
                              page ===
                                Math.ceil(totalResults / itemsPerPage) ||
                              (page >= currentPage - 2 &&
                                page <= currentPage + 2)
                            );
                          })
                          .map((page, index, array) => {
                            // ... 표시를 위한 로직
                            const prevPage = array[index - 1];
                            const showEllipsis = prevPage && page - prevPage > 1;

                            return (
                              <div key={page} className='flex items-center'>
                                {showEllipsis && (
                                  <span className='px-2 text-gray-500'>
                                    ...
                                  </span>
                                )}
                                <PaginationItem>
                                  <PaginationLink
                                    onClick={() => goToPage(page)}
                                    isActive={currentPage === page}
                                    className='cursor-pointer'
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              </div>
                            );
                          })}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() => goToPage(currentPage + 1)}
                            className={
                              currentPage ===
                              Math.ceil(totalResults / itemsPerPage)
                                ? 'pointer-events-none opacity-50'
                                : 'cursor-pointer'
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
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
  );
};

export default AddBookPage;
