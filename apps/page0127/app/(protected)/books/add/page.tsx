'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import {
  upgradeImageResolution,
  validateSpineImageUrl,
} from '@/shared/lib/imageUtils';
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
import { DuplicateBookDialog } from '@/features/book/ui/DuplicateBookDialog';

import type { AladinBook, Book } from '@/entities/book/types';

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
  const { createBook, getBookByISBN, isLoading: isCreating } = useBookCRUD();

  const [selectedBook, setSelectedBook] = useState<AladinBook | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // 중복 체크 모달 상태
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [existingBook, setExistingBook] = useState<Book | null>(null);
  const [pendingBook, setPendingBook] = useState<AladinBook | null>(null);

  // 책 선택 시 중복 체크 + 상세 정보 조회
  const handleSelectBook = async (book: AladinBook) => {
    setIsLoadingDetail(true);

    try {
      // 1. ISBN으로 기존 책 확인 (중복 등록 체크)
      const existingBooks = await getBookByISBN(book.isbn13);

      if (existingBooks.length > 0) {
        // 기존 책이 있다면 모달 표시
        setExistingBook(existingBooks[0]);
        setPendingBook(book);
        setDuplicateDialogOpen(true);
        setIsLoadingDetail(false);
        return;
      }

      // 2. 알라딘 상세 조회 API로 쪽수 정보 가져오기
      const response = await fetch(`/api/books/detail?isbn=${book.isbn13}`);

      if (!response.ok) {
        throw new Error('상세 정보 조회 실패');
      }

      const data = await response.json();
      const detailedBook = data.item?.[0];

      // 상세 정보가 있으면 병합, 없으면 기본 정보만 사용
      if (detailedBook) {
        setSelectedBook({
          ...book,
          subInfo: detailedBook.subInfo,
        });
      } else {
        setSelectedBook(book);
      }
    } catch (error) {
      console.error('상세 정보 조회 실패:', error);
      // 실패해도 기본 정보로 진행
      setSelectedBook(book);
      toast.error('상세 정보 조회에 실패했습니다. 기본 정보로 진행합니다.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // 재독 선택 시 - 등록 폼 표시
  const handleReread = async () => {
    if (!pendingBook) return;

    setDuplicateDialogOpen(false);
    setIsLoadingDetail(true);

    try {
      // 알라딘 상세 조회 API로 쪽수 정보 가져오기
      const response = await fetch(
        `/api/books/detail?isbn=${pendingBook.isbn13}`
      );

      if (!response.ok) {
        throw new Error('상세 정보 조회 실패');
      }

      const data = await response.json();
      const detailedBook = data.item?.[0];

      // 상세 정보가 있으면 병합, 없으면 기본 정보만 사용
      if (detailedBook) {
        setSelectedBook({
          ...pendingBook,
          subInfo: detailedBook.subInfo,
        });
      } else {
        setSelectedBook(pendingBook);
      }
    } catch (error) {
      console.error('상세 정보 조회 실패:', error);
      setSelectedBook(pendingBook);
      toast.error('상세 정보 조회에 실패했습니다. 기본 정보로 진행합니다.');
    } finally {
      setIsLoadingDetail(false);
      setPendingBook(null);
    }
  };

  // 수정 선택 시 - 기존 책 수정 페이지로 이동
  const handleEdit = () => {
    if (!existingBook) return;

    setDuplicateDialogOpen(false);
    toast.info('기존 책 수정 페이지로 이동합니다.');
    router.push(`/books/${existingBook.id}/edit`);
  };

  const handleSubmit = async (formData: BookFormData) => {
    if (!selectedBook) return;

    // 이미지 URL 변환 및 검증
    const highResCoverImage = upgradeImageResolution(selectedBook.cover);
    const spineImage = await validateSpineImageUrl(
      selectedBook.cover,
      selectedBook.isbn13
    );

    // 재독 횟수 계산 (기존 책이 있으면 +1, 없으면 1)
    const readCount = existingBook ? existingBook.read_count + 1 : 1;

    // 알라딘 도서 정보 + 사용자 입력 데이터 결합
    const bookData = {
      isbn: selectedBook.isbn13,
      title: selectedBook.title,
      author: selectedBook.author,
      publisher: selectedBook.publisher,
      cover_image: highResCoverImage, // 고해상도 표지 이미지
      spine_image: spineImage, // 책등 이미지
      description: selectedBook.description,
      pub_date: selectedBook.pubDate,
      category: selectedBook.categoryName,
      page_count: selectedBook.subInfo?.itemPage, // 쪽수 정보 저장
      read_count: readCount, // 재독 횟수
      ...formData,
    };

    // 책 등록
    const result = await createBook(bookData);

    if (result) {
      const message =
        readCount > 1
          ? `${readCount}회독 도서가 등록되었습니다!`
          : '도서가 등록되었습니다!';
      toast.success(message);

      // 상태 초기화
      setExistingBook(null);

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
                  {books.map((book, index) => (
                    <BookSearchResultCard
                      key={`${book.isbn13}-${index}`}
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
            <>
              {isLoadingDetail ? (
                <p className='text-center text-gray-500'>
                  도서 상세 정보를 불러오는 중...
                </p>
              ) : (
                <BookRegistrationForm
                  book={selectedBook}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                  isLoading={isCreating}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* 중복 책 발견 모달 */}
      {existingBook && pendingBook && (
        <DuplicateBookDialog
          open={duplicateDialogOpen}
          onOpenChange={setDuplicateDialogOpen}
          existingBook={existingBook}
          bookTitle={pendingBook.title}
          onReread={handleReread}
          onEdit={handleEdit}
        />
      )}
    </ErrorBoundary>
  );
};

export default AddBookPage;
