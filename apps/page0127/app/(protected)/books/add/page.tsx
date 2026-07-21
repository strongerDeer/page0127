'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import {
  upgradeImageResolution,
  validateSpineImageUrl,
} from '@/shared/lib/imageUtils';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { PageContainer } from '@/shared/ui/PageContainer';

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

import type { AladinBook, Book } from '@/entities/book';

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
  const {
    createBook,
    updateBook,
    getBookByISBN,
    isLoading: isCreating,
  } = useBookCRUD();

  const [selectedBook, setSelectedBook] = useState<AladinBook | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // 실험 1: forwardRef → React 19 ref as prop — 페이지 진입 시 자동 포커스
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // 실험 1 심화: '/' 단축키로 언제든 검색창 포커스
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return; // 입력 중에는 무시
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus(); // useImperativeHandle 없이 DOM ref 직접 호출
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 중복 체크 모달 상태
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [existingBook, setExistingBook] = useState<Book | null>(null);
  const [pendingBook, setPendingBook] = useState<AladinBook | null>(null);

  // 알라딘 상세 조회 → 쪽수(subInfo)를 병합해 등록 폼으로 넘긴다.
  // handleSelectBook·handleReread가 같은 try/catch ~40줄을 복붙하고 있던 것을 추출.
  // 실패해도 기본 정보로 진행한다 — 상세 조회는 보강이지 필수가 아니다.
  const loadBookDetail = async (book: AladinBook) => {
    setIsLoadingDetail(true);
    try {
      const response = await fetch(`/api/books/detail?isbn=${book.isbn13}`);
      if (!response.ok) throw new Error('상세 정보 조회 실패');

      const data = await response.json();
      const detailedBook = data.item?.[0];
      setSelectedBook(
        detailedBook ? { ...book, subInfo: detailedBook.subInfo } : book
      );
    } catch (error) {
      console.error('상세 정보 조회 실패:', error);
      setSelectedBook(book);
      toast.error('상세 정보 조회에 실패했습니다. 기본 정보로 진행합니다.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // 책 선택 시 중복 체크 + 상세 정보 조회
  const handleSelectBook = async (book: AladinBook) => {
    setIsLoadingDetail(true);

    // ISBN으로 기존 책 확인 (중복 등록 체크)
    const existingBooks = await getBookByISBN(book.isbn13);

    if (existingBooks.length > 0) {
      // 기존 책이 있다면 모달 표시
      setExistingBook(existingBooks[0]);
      setPendingBook(book);
      setDuplicateDialogOpen(true);
      setIsLoadingDetail(false);
      return;
    }

    await loadBookDetail(book);
  };

  // 재독 선택 시 - 등록 폼 표시
  const handleReread = async () => {
    if (!pendingBook) return;

    setDuplicateDialogOpen(false);
    await loadBookDetail(pendingBook);
    setPendingBook(null);
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

    // 표지는 고해상도로 즉시 변환. 책등(spine) 이미지는 알라딘에 실제로 존재하는지
    // 확인해야 하는데(최대 3초 x 2회) 이 검증을 등록 전에 기다리면 체감 등록 시간이
    // 크게 늘어난다. 그래서 등록은 먼저 끝내고, 검증은 아래에서 백그라운드로 돌린다.
    const highResCoverImage = upgradeImageResolution(selectedBook.cover);

    // 재독 횟수 계산 (기존 책이 있으면 +1, 없으면 1)
    const readCount = existingBook ? existingBook.read_count + 1 : 1;

    // 알라딘 도서 정보 + 사용자 입력 데이터 결합
    const bookData = {
      isbn: selectedBook.isbn13,
      title: selectedBook.title,
      author: selectedBook.author,
      publisher: selectedBook.publisher,
      cover_image: highResCoverImage, // 고해상도 표지 이미지
      spine_image: null, // 책등 이미지 — 등록 성공 후 백그라운드로 채운다
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

      // 책등 이미지 존재 여부 확인 — 등록을 막지 않도록 결과를 기다리지 않는다
      validateSpineImageUrl(selectedBook.cover, selectedBook.isbn13).then(
        (spineImage) => updateBook(result.id, { spine_image: spineImage })
      );
    } else {
      toast.error('도서 등록에 실패했습니다.');
    }
  };

  const handleCancel = () => {
    setSelectedBook(null);
  };

  return (
    <ErrorBoundary>
      <PageContainer width='content'>
        <h1 className='heading-1 mb-6 text-text-strong'>도서 추가</h1>

        {/* 등록 폼이 열려있지 않을 때만 검색 UI 표시 */}
        {!selectedBook ? (
          <div className='space-y-6'>
            {/* 검색 입력 */}
            <BookSearchInput
              ref={searchInputRef}
              onSearch={search}
              isLoading={isSearching}
            />

            {/* 로딩 상태 */}
            {isSearching && (
              <p className='text-center text-muted-foreground'>검색 중...</p>
            )}

            {/* 검색 결과 — 행 리스트를 카드 하나에 담는다 */}
            {!isSearching && books.length > 0 && (
              <div className='space-y-3'>
                <p className='text-sm text-text-subtle'>
                  총 {totalResults.toLocaleString()}권 중 {books.length}권
                </p>
                <div className='divide-y divide-line-soft border-t border-line'>
                  {books.map((book, index) => (
                    <BookSearchResultCard
                      key={`${book.isbn13}-${index}`}
                      book={book}
                      onSelect={handleSelectBook}
                    />
                  ))}
                </div>

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
              <p className='text-center text-muted-foreground'>
                도서 제목을 검색해주세요
              </p>
            )}
          </div>
        ) : (
          /* 등록 폼 */
          <>
            {isLoadingDetail ? (
              <p className='text-center text-muted-foreground'>
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
      </PageContainer>

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
