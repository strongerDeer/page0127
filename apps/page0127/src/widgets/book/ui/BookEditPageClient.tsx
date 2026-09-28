'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@repo/ui';
import { Card, CardContent, CardHeader, Skeleton } from '@repo/ui';
import { ErrorBoundary, PageContainer } from '@repo/ui';
import { toast } from 'sonner';

import { getBookDetail } from '@/shared/api/book';
import { trackEvent } from '@/shared/lib/analytics/trackEvent';
import { resolveSpineImageUrl } from '@/shared/lib/spineImage';

import { isNewlyCompleted } from '@/entities/book/model/completion';

import { useBookCRUD } from '@/features/book/api/useBookCRUD';
import { useBookSearch } from '@/features/book/api/useBookSearch';
import {
  type BookFormData,
  BookRegistrationForm,
} from '@/features/book/ui/BookRegistrationForm';
import { BookSearchInput } from '@/features/book/ui/BookSearchInput';
import { BookSearchPagination } from '@/features/book/ui/BookSearchPagination';
import { BookSearchResultCard } from '@/features/book/ui/BookSearchResultCard';

import type { Book, BookInput, ProviderBook } from '@/entities/book';

type BookEditPageClientProps = {
  bookId: string;
  username: string;
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
export const BookEditPageClient = ({
  bookId: id,
  username,
}: BookEditPageClientProps) => {
  const router = useRouter();
  const { getBookById, updateBook, isLoading } = useBookCRUD();
  const [book, setBook] = useState<Book | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // "책 선택부터 다시" — 검색으로 다른 책을 골라 현재 기록에 덮어씌운다.
  // reselectedBook이 있으면 폼 미리보기·저장 시 원래 book 대신 이 책 정보를 쓴다.
  const [isReselecting, setIsReselecting] = useState(false);
  const [reselectedBook, setReselectedBook] = useState<ProviderBook | null>(null);
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

    // 저장 **전에** 판정해야 한다 — updateBook 이 성공하면 book 은 이미 새 상태다.
    // 판정 규칙은 서버가 활동 기록을 만들 때 쓰는 것과 같은 함수를 쓴다.
    const justCompleted = isNewlyCompleted(book?.status, formData.status);

    // 책을 다시 선택했다면 도서 자체 정보(제목/저자/표지 등)도 함께 갱신
    const updates: Partial<BookInput> = { ...formData };
    if (reselectedBook) {
      updates.isbn = reselectedBook.isbn;
      updates.title = reselectedBook.title;
      updates.sub_title = reselectedBook.subTitle;
      updates.source = reselectedBook.source;
      updates.provider_item_id = reselectedBook.providerItemId;
      updates.author = reselectedBook.author;
      updates.publisher = reselectedBook.publisher;
      // 표지는 어댑터가 이미 최대 해상도로 맞춰 준다
      updates.cover_image = reselectedBook.coverImage;
      // 책등(spine) 이미지는 실제로 존재하는지 확인해야 하는데, 이 검증(최대 3초)을
      // 저장 전에 기다리면 체감 저장 시간이 늘어난다. 저장을 먼저 끝내고
      // 검증은 아래에서 저장 성공 후 백그라운드로 돌린다.
      updates.spine_image = null;
      updates.description = reselectedBook.description;
      updates.pub_date = reselectedBook.pubDate ?? undefined;
      updates.category = reselectedBook.category;
      updates.page_count = reselectedBook.page ?? undefined;
    }

    const result = await updateBook(id, updates);

    if (result) {
      if (justCompleted) trackEvent('book_complete', { from: 'edit' });

      toast.success('도서 정보가 수정되었습니다!');
      router.push(`/${username}/${id}`); // 수정한 책 상세로 이동

      // 책등 이미지 존재 여부 확인 — 저장을 막지 않도록 결과를 기다리지 않는다
      if (reselectedBook) {
        resolveSpineImageUrl(reselectedBook.spineImage).then((spineImage) =>
          updateBook(id, { spine_image: spineImage })
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
  const handleSelectBook = async (selected: ProviderBook) => {
    setIsLoadingDetail(true);
    try {
      const detailed = await getBookDetail(selected.isbn);
      // 상세가 없으면(204) 검색 결과 그대로 간다 — 오류가 아니다
      setReselectedBook(detailed ?? selected);
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

  // 저장된 Book 을 공급자 형식으로 되돌린다 (책을 다시 선택했다면 그 책 정보 우선).
  // 수정 화면은 등록 폼을 재사용하므로 폼이 아는 한 가지 형태로 맞춰 준다.
  const providerBookFormat: ProviderBook = reselectedBook || {
    isbn: book.isbn,
    title: book.title,
    subTitle: book.sub_title,
    author: book.author || '',
    publisher: book.publisher || '',
    pubDate: book.pub_date,
    description: book.description || '',
    category: book.category || '',
    coverImage: book.cover_image || '',
    spineImage: book.spine_image,
    backImage: null,
    page: book.page_count,
    toc: book.toc,
    // 저장된 책에는 치수가 없다 — 백필이 global_books 에만 채운다
    dimensions: null,
    // 저장된 책은 어느 공급자에서 왔는지 행에 남아 있지 않다. 이 값은 폼 표시에만
    // 쓰이고 다시 저장되지 않으므로, 실제 출처를 꾸며내지 않도록 manual 로 둔다.
    source: 'manual',
    providerItemId: null,
    providerLink: '',
  };

  // 책 선택 화면 — "책 선택부터 다시" 클릭 시 폼 대신 검색 UI를 보여준다
  if (isReselecting) {
    return (
      <ErrorBoundary>
        <PageContainer width='content'>
          <h1 className='heading-1 mb-6'>책 다시 선택</h1>

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
                        key={`${result.isbn}-${index}`}
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
          book={providerBookFormat}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onReselectBook={() => setIsReselecting(true)}
          isLoading={isUpdating}
          initialData={{
            status: book.status,
            completed_date: book.completed_date || undefined,
            start_date: book.start_date || undefined,
            rating: book.rating || undefined,
            is_life_book: book.is_life_book,
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
