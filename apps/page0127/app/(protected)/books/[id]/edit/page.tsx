'use client';

import { use, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import {
  upgradeImageResolution,
  validateSpineImageUrl,
} from '@/shared/lib/imageUtils';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { PageContainer } from '@/shared/ui/PageContainer';
import { Skeleton } from '@/shared/ui/skeleton';

import { useBookCRUD } from '@/features/book/api/useBookCRUD';
import { useBookSearch } from '@/features/book/api/useBookSearch';
import {
  type BookFormData,
  BookRegistrationForm,
} from '@/features/book/ui/BookRegistrationForm';
import { BookSearchInput } from '@/features/book/ui/BookSearchInput';
import { BookSearchPagination } from '@/features/book/ui/BookSearchPagination';
import { BookSearchResultCard } from '@/features/book/ui/BookSearchResultCard';

import type { AladinBook, Book, BookInput } from '@/entities/book';

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * 도서 수정 페이지
 *
 * 학습 포인트:
 * - BookRegistrationForm 재사용
 * - 기존 데이터 불러오기
 * - PATCH API 호출
 * - 수정 후 상세 페이지로 리다이렉트
 */
const BookEditPage = ({ params }: PageProps) => {
  const { id } = use(params);
  const router = useRouter();
  const { getBookById, updateBook, isLoading } = useBookCRUD();
  const [book, setBook] = useState<Book | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // "책 선택부터 다시" — 검색으로 다른 책을 골라 현재 기록에 덮어씌운다.
  // reselectedBook이 있으면 폼 미리보기·저장 시 원래 book 대신 이 책 정보를 쓴다.
  const [isReselecting, setIsReselecting] = useState(false);
  const [reselectedBook, setReselectedBook] = useState<AladinBook | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const {
    books: searchResults,
    isLoading: isSearching,
    search,
    goToPage,
    currentPage,
    totalResults,
    itemsPerPage,
  } = useBookSearch();

  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isReselecting) searchInputRef.current?.focus();
  }, [isReselecting]);

  // 책 데이터 불러오기
  useEffect(() => {
    // AbortController: 컴포넌트 언마운트 시 진행 중인 fetch를 취소
    const controller = new AbortController();

    const loadBook = async () => {
      const data = await getBookById(id);
      // abort된 경우 setBook 호출하지 않음 (언마운트된 컴포넌트에 상태 변경 방지)
      if (!controller.signal.aborted) {
        setBook(data);
      }
    };

    loadBook();

    return () => controller.abort();
  }, [id, getBookById]);

  const handleSubmit = async (formData: BookFormData) => {
    setIsUpdating(true);

    // 책을 다시 선택했다면 도서 자체 정보(제목/저자/표지 등)도 함께 갱신
    const updates: Partial<BookInput> = { ...formData };
    if (reselectedBook) {
      updates.isbn = reselectedBook.isbn13;
      updates.title = reselectedBook.title;
      updates.author = reselectedBook.author;
      updates.publisher = reselectedBook.publisher;
      updates.cover_image = upgradeImageResolution(reselectedBook.cover);
      // 책등(spine) 이미지는 알라딘에 실제로 존재하는지 확인해야 하는데,
      // 이 검증(최대 3초 x 2회)을 저장 전에 기다리면 체감 저장 시간이 크게 늘어난다.
      // 그래서 저장은 먼저 끝내고, 검증은 아래에서 저장 성공 후 백그라운드로 돌린다.
      updates.spine_image = null;
      updates.description = reselectedBook.description;
      updates.pub_date = reselectedBook.pubDate;
      updates.category = reselectedBook.categoryName;
      updates.page_count = reselectedBook.subInfo?.itemPage;
    }

    const result = await updateBook(id, updates);

    if (result) {
      toast.success('도서 정보가 수정되었습니다!');
      router.push('/books'); // 도서 목록으로 이동

      // 책등 이미지 존재 여부 확인 — 저장을 막지 않도록 결과를 기다리지 않는다
      if (reselectedBook) {
        validateSpineImageUrl(reselectedBook.cover, reselectedBook.isbn13).then(
          (spineImage) => updateBook(id, { spine_image: spineImage })
        );
      }
    } else {
      toast.error('도서 수정에 실패했습니다.');
    }

    setIsUpdating(false);
  };

  const handleCancel = () => {
    router.back();
  };

  // 검색 결과에서 책을 고르면 쪽수 등 상세 정보를 보강해 미리보기로 전환
  const handleSelectBook = async (selected: AladinBook) => {
    setIsLoadingDetail(true);
    try {
      const response = await fetch(`/api/books/detail?isbn=${selected.isbn13}`);
      if (!response.ok) throw new Error('상세 정보 조회 실패');

      const data = await response.json();
      const detailedBook = data.item?.[0];
      setReselectedBook(
        detailedBook ? { ...selected, subInfo: detailedBook.subInfo } : selected
      );
    } catch (error) {
      console.error('상세 정보 조회 실패:', error);
      setReselectedBook(selected);
      toast.error('상세 정보 조회에 실패했습니다. 기본 정보로 진행합니다.');
    } finally {
      setIsLoadingDetail(false);
      setIsReselecting(false);
    }
  };

  // 로딩 중
  if (isLoading || !book) {
    return (
      <ErrorBoundary>
        <PageContainer width='content'>
          <Card>
            <CardHeader>
              <Skeleton className='h-8 w-32' />
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* 책 정보 미리보기 */}
              <div className='flex gap-4 rounded-lg bg-muted/50 p-4'>
                <Skeleton className='h-32 w-24 shrink-0' />
                <div className='flex-1 space-y-2'>
                  <Skeleton className='h-6 w-3/4' />
                  <Skeleton className='h-4 w-1/2' />
                  <Skeleton className='h-4 w-1/3' />
                </div>
              </div>

              {/* 폼 필드들 */}
              <div className='space-y-4'>
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-10 w-full' />
                <Skeleton className='h-20 w-full' />
                <Skeleton className='h-10 w-full' />
              </div>

              {/* 버튼 */}
              <div className='flex gap-3'>
                <Skeleton className='h-10 flex-1' />
                <Skeleton className='h-10 flex-1' />
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </ErrorBoundary>
    );
  }

  // Book 타입을 AladinBook 형식으로 변환 (책을 다시 선택했다면 그 책 정보 우선)
  const aladinBookFormat: AladinBook = reselectedBook || {
    isbn13: book.isbn,
    title: book.title,
    author: book.author || '',
    publisher: book.publisher || '',
    cover: book.cover_image || '',
    description: book.description || '',
    pubDate: book.pub_date || '',
    categoryName: book.category || '',
    priceStandard: 0, // 수정 시에는 가격 정보 불필요
    link: '', // 수정 시에는 링크 정보 불필요
  };

  // 책 선택 화면 — "책 선택부터 다시" 클릭 시 폼 대신 검색 UI를 보여준다
  if (isReselecting) {
    return (
      <ErrorBoundary>
        <PageContainer width='content'>
          <h1 className='heading-1 mb-6 text-text-strong'>책 다시 선택</h1>

          {isLoadingDetail ? (
            <p className='text-center text-muted-foreground'>
              도서 상세 정보를 불러오는 중...
            </p>
          ) : (
            <div className='space-y-6'>
              <BookSearchInput
                ref={searchInputRef}
                onSearch={search}
                isLoading={isSearching}
              />

              {isSearching && (
                <p className='text-center text-muted-foreground'>검색 중...</p>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className='space-y-3'>
                  <p className='text-sm text-text-subtle'>
                    총 {totalResults.toLocaleString()}권 중{' '}
                    {searchResults.length}권
                  </p>
                  <div className='divide-y divide-line-soft border-t border-line'>
                    {searchResults.map((result, index) => (
                      <BookSearchResultCard
                        key={`${result.isbn13}-${index}`}
                        book={result}
                        onSelect={handleSelectBook}
                      />
                    ))}
                  </div>

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

              {!isSearching && searchResults.length === 0 && (
                <p className='text-center text-muted-foreground'>
                  도서 제목을 검색해주세요
                </p>
              )}

              <Button
                type='button'
                variant='outline'
                onClick={() => setIsReselecting(false)}
              >
                취소
              </Button>
            </div>
          )}
        </PageContainer>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <PageContainer width='content'>
        <BookRegistrationForm
          book={aladinBookFormat}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onReselectBook={() => setIsReselecting(true)}
          isLoading={isUpdating}
          initialData={{
            status: book.status,
            completed_date: book.completed_date || undefined,
            start_date: book.start_date || undefined,
            rating: book.rating || undefined,
            one_line_review: book.one_line_review || undefined,
            personal_memo: book.personal_memo || undefined,
            tags: book.tags || undefined,
            is_public: book.is_public,
          }}
        />
      </PageContainer>
    </ErrorBoundary>
  );
};

export default BookEditPage;
