'use client';

import { Suspense, useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button, ErrorBoundary, PageContainer } from '@repo/ui';
import { toast } from 'sonner';

import { getBookDetail } from '@/shared/api/book';
import { trackEvent } from '@/shared/lib/analytics/trackEvent';
import { resolveSpineImageUrl } from '@/shared/lib/spineImage';

import { BACKGROUND_SPINE_TIMEOUT_MS, bookApi } from '@/entities/book';
import { BookSourceCredit } from '@/entities/book/ui/BookSourceCredit';

import { notifyNewBadges } from '@/features/badge';
import { useBookCRUD } from '@/features/book/api/useBookCRUD';
import { useBookSearch } from '@/features/book/api/useBookSearch';
import { resolveReadCount } from '@/features/book/lib/resolveReadCount';
import { BarcodeScanDialog } from '@/features/book/ui/BarcodeScanDialog';
import {
  type BookFormData,
  BookRegistrationForm,
} from '@/features/book/ui/BookRegistrationForm';
import { BookSavedCard } from '@/features/book/ui/BookSavedCard';
import { BookSearchInput } from '@/features/book/ui/BookSearchInput';
import { BookSearchPagination } from '@/features/book/ui/BookSearchPagination';
import { BookSearchResultCard } from '@/features/book/ui/BookSearchResultCard';
import { DuplicateBookDialog } from '@/features/book/ui/DuplicateBookDialog';
import { uploadManualCover } from '@/features/book-review/lib/uploadManualCover';
import { validateManualBook } from '@/features/book-review/model/review';
import {
  EMPTY_MANUAL_BOOK,
  type ManualBookDraft,
  ManualBookFields,
} from '@/features/book-review/ui/ManualBookForm';

import type { Book, ProviderBook } from '@/entities/book';

// 직접 등록 폼은 미리보기를 그리지 않으므로 책 자리는 빈 값으로 채운다
const EMPTY_PROVIDER_BOOK: ProviderBook = {
  isbn: '',
  title: '',
  author: '',
  publisher: '',
  subTitle: null,
  source: 'manual',
  coverImage: '',
  spineImage: null,
  backImage: null,
  providerItemId: null,
  providerLink: '',
  pubDate: null,
  description: '',
  category: '',
  page: null,
  toc: null,
  dimensions: null,
};

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
  const searchParams = useSearchParams();
  const initialStatus =
    searchParams.get('status') === 'reading' ? 'reading' : 'completed';
  const router = useRouter();
  // 직접 등록은 검색과 다른 화면이다 — 주소에 남겨 뒤로 가기로 검색에 돌아올 수 있게 한다
  const isManual = searchParams.get('mode') === 'manual';
  const {
    books,
    catalogBooks,
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

  // 직접 등록 입력값. 검색어(?title=)가 있으면 제목칸을 채워 둔다 — 찾다가 없어서 온 것이므로
  const [manualDraft, setManualDraft] = useState<ManualBookDraft>(() => ({
    ...EMPTY_MANUAL_BOOK,
    title: searchParams.get('title') ?? '',
  }));
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<ProviderBook | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // 저장 완료 단계 — 검색/폼과 같은 방식으로 state 전환한다(라우트를 늘리지 않는다).
  // 완독일 때만 채워진다. 읽고싶어요·읽는 중은 예전처럼 서재로 보낸다.
  const [saved, setSaved] = useState<{
    book: Book;
    completedCount: number | null;
    readCount: number;
  } | null>(null);

  // 저장 후처리(완독 권수 조회) 동안에도 폼을 잠근 채로 둔다.
  // createBook 의 finally 가 isCreating 을 먼저 내려버려서, 이 플래그가 없으면
  // 통계 왕복 동안 등록 버튼이 되살아나는데 완독 경로엔 토스트도 없다 →
  // 사용자는 아무 반응이 없으니 한 번 더 누른다. 재독이 같은 ISBN 으로 행을
  // 하나 더 만들어야 하므로 (user_id, isbn) 유니크 제약으로는 막을 수 없다.
  // 중요: createBook 이 풀리는 순간 useBookCRUD 의 finally 가 isCreating 을 내리므로,
  // 그 사이에 await 를 넣으면 버튼이 잠깐 살아나 이 방어가 무너진다.
  const [isFinishing, setIsFinishing] = useState(false);

  // 실험 1: forwardRef → React 19 ref as prop — 페이지 진입 시 자동 포커스
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!isManual) searchInputRef.current?.focus();
  }, [isManual]);

  const handleSearch = (query: string) => {
    setLastQuery(query.trim());
    return search(query);
  };

  // 직접 등록 화면으로 — 방금 찾던 제목을 들고 간다(ISBN 이면 ISBN 칸으로)
  const openManual = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', 'manual');
    const digits = lastQuery.replace(/[\s-]/g, '');
    params.delete('title');
    if (/^\d{13}$/.test(digits)) {
      setManualDraft({ ...EMPTY_MANUAL_BOOK, isbn: digits });
    } else {
      setManualDraft({ ...EMPTY_MANUAL_BOOK, title: lastQuery });
      if (lastQuery) params.set('title', lastQuery);
    }
    router.push(`/books/add?${params}`);
  };

  const closeManual = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('mode');
    params.delete('title');
    const rest = params.toString();
    router.replace(rest ? `/books/add?${rest}` : '/books/add');
  };

  // 실험 1 심화: '/' 단축키로 언제든 검색창 포커스
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return; // 입력 중에는 무시
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
  const [pendingBook, setPendingBook] = useState<ProviderBook | null>(null);

  // 상세 조회 → 쪽수·목차를 보강해 등록 폼으로 넘긴다. 검색 응답에는 쪽수가 없다.
  // handleSelectBook·handleReread가 같은 try/catch ~40줄을 복붙하고 있던 것을 추출.
  // 실패해도 기본 정보로 진행한다 — 상세 조회는 보강이지 필수가 아니다.
  const loadBookDetail = async (book: ProviderBook) => {
    setIsLoadingDetail(true);
    try {
      const detailed = await getBookDetail(book.isbn);
      // 상세가 없으면(204) 검색 결과 그대로 간다 — 오류가 아니다
      setSelectedBook(detailed ?? book);
    } catch (error) {
      console.error('상세 정보 조회 실패:', error);
      setSelectedBook(book);
      toast.error('상세 정보 조회에 실패했습니다. 기본 정보로 진행합니다.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // 책 선택 시 중복 체크 + 상세 정보 조회
  const handleSelectBook = async (book: ProviderBook) => {
    setIsLoadingDetail(true);

    // ISBN으로 기존 책 확인 (중복 등록 체크)
    // 상품번호도 함께 넘긴다 — isbn 만 보면 K코드로 담아 둔 같은 책을 못 알아보고
    // 중복 경고 없이 쌍둥이 행이 생긴다(2026-09-29 운영에서 3권 발생)
    const existingBooks = await getBookByISBN(book.isbn, book.providerItemId);

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

  // 바코드로 읽은 ISBN — 검색 목록을 거치지 않고 그 책으로 바로 넘어간다.
  // 중복 확인·상세 보강은 목록에서 고른 것과 같은 길(handleSelectBook)을 탄다.
  const [isScanOpen, setIsScanOpen] = useState(false);
  // 읽은 ISBN 을 검색창에 채워 둔다. 비워 두면 책을 불러오는 동안 검색창에
  // 돌아가는 예시 제목(placeholder)이 보여서 다른 책이 찍힌 것처럼 보인다.
  const [scannedIsbn, setScannedIsbn] = useState<string | null>(null);
  const [isScanLookup, setIsScanLookup] = useState(false);
  const handleScanned = async (isbn: string, source: 'camera' | 'photo') => {
    setIsScanOpen(false);
    setScannedIsbn(isbn);
    setIsScanLookup(true);
    try {
      const book = await getBookDetail(isbn).catch(() => null);
      trackEvent('book_barcode_scan', { source, found: !!book });
      if (!book) {
        // 검색창에 ISBN 이 들어가 있으니 일반 검색 결과는 그대로 아래에 뜬다
        toast.error(
          `바코드(ISBN ${isbn})로 책을 찾지 못했어요. 제목으로 검색해 주세요.`
        );
        return;
      }
      await handleSelectBook(book);
    } finally {
      setIsScanLookup(false);
    }
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
    await saveBook(selectedBook, formData);
  };

  // 직접 등록 저장 — 서지 정보 검증 → 표지 올리기 → 같은 저장 길(saveBook)
  const handleManualSubmit = async (formData: BookFormData) => {
    let values: ReturnType<typeof validateManualBook>;
    try {
      values = validateManualBook(manualDraft);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '입력을 확인해 주세요.');
      return;
    }

    let coverImage = '';
    if (manualDraft.coverFile) {
      setIsUploadingCover(true);
      try {
        coverImage = await uploadManualCover(manualDraft.coverFile);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : '표지 사진을 올리지 못했어요.'
        );
        setIsUploadingCover(false);
        return;
      }
    }

    // 표지를 올린 뒤 저장이 시작되기 전 틈에 버튼이 살아나지 않도록 저장이 끝날 때 푼다
    try {
      await saveBook(
        {
          isbn: values.isbn || `manual:${crypto.randomUUID()}`,
          title: values.title,
          author: values.author,
          publisher: values.publisher,
          subTitle: null,
          source: 'manual',
          sourceUrl: values.source_url,
          coverImage,
          spineImage: null,
          backImage: null,
          providerItemId: null,
          providerLink: '',
          pubDate: null,
          description: '',
          category: '',
          page: null,
          toc: null,
          dimensions: null,
        },
        formData
      );
    } finally {
      setIsUploadingCover(false);
    }
  };

  const saveBook = async (
    selectedBook: ProviderBook,
    formData: BookFormData
  ) => {
    // 재독 횟수 계산 — existingBook 은 중복 다이얼로그를 취소해도 남아 있어서
    // ISBN 이 지금 저장하는 책과 같은지 함께 본다(자세한 근거는 resolveReadCount 주석)
    const readCount = resolveReadCount(existingBook, selectedBook.isbn);

    // 공급자 도서 정보 + 사용자 입력 데이터 결합.
    // 표지는 어댑터가 이미 최대 해상도로 맞춰 준다.
    const bookData = {
      isbn: selectedBook.isbn,
      source_url: selectedBook.sourceUrl,
      title: selectedBook.title,
      sub_title: selectedBook.subTitle,
      // 출처 표기(약관 의무)에 필요하다 — 화면이 books 를 직접 읽으므로 여기 같이 담는다
      source: selectedBook.source,
      provider_item_id: selectedBook.providerItemId,
      author: selectedBook.author,
      publisher: selectedBook.publisher,
      cover_image: selectedBook.coverImage,
      // 책등 이미지는 실제로 존재하는지 확인해야 하는데(최대 3초) 그 검증을 등록 전에
      // 기다리면 체감 등록 시간이 늘어난다. 등록을 먼저 끝내고 아래에서 백그라운드로 채운다.
      spine_image: null,
      description: selectedBook.description,
      pub_date: selectedBook.pubDate ?? undefined,
      category: selectedBook.category,
      page_count: selectedBook.page ?? undefined,
      read_count: readCount, // 재독 횟수
      ...formData,
    };

    // 책 등록
    const result = await createBook(bookData);

    if (result) {
      if (selectedBook.source === 'manual')
        toast.success(
          '기록을 저장했어요. 내 등록 요청에서 검수 상태를 확인할 수 있어요.'
        );
      // 활성화 계측 — 가입 다음 단계가 "첫 책을 꽂았다"이다.
      // 등록하면서 바로 완독으로 담는 경우가 흔한데, 그 흐름은 편집 화면을 거치지
      // 않으므로 여기서 세지 않으면 그 완독은 통째로 누락된다.
      trackEvent('book_add', {
        status: formData.status,
        read_count: readCount,
      });
      if (formData.status === 'completed') {
        trackEvent('book_complete', { from: 'register' });
      }

      // 상태 초기화
      setExistingBook(null);

      // 책등 이미지 존재 여부 확인 — 등록을 막지 않도록 결과를 기다리지 않는다.
      // YES24는 책등이 없어도 200에 회색 플레이스홀더를 주므로 크기로 판정한다.
      // 모바일 데이터에서는 3초로 모자라 책등이 빠지곤 했다 — 뒤에서 하는 일이라 넉넉히 기다린다.
      // 그래도 놓치면(앱을 내림 등) 서재를 열 때 다시 채운다(useRepairMissingSpines).
      resolveSpineImageUrl(
        selectedBook.spineImage,
        BACKGROUND_SPINE_TIMEOUT_MS
      ).then((spineImage) => {
        if (spineImage) updateBook(result.id, { spine_image: spineImage });
      });

      // 완독이 아니면 "책장에 꽂혔어요"가 거짓이 된다 — 예전 흐름 그대로 서재로 보낸다
      if (formData.status !== 'completed') {
        toast.success(
          readCount > 1
            ? `${readCount}회독 도서가 등록되었습니다!`
            : '도서가 등록되었습니다!'
        );
        router.push('/books');
        return;
      }

      // 여기부터는 완독 후처리 — 카드로 전환되기 전까지 폼을 잠근 상태로 유지한다
      setIsFinishing(true);

      // 완독 권수는 결과 문구에만 쓴다. 실패해도 카드는 떠야 하므로 막지 않는다.
      // 다만 catch 는 실질 방어선이 아니다 — getBookStats 는 DB·RLS 에러를 스스로 잡아
      // totalCompletedBooks: 0 을 반환하고 라우트가 200 으로 감싸므로, 여기로 throw 되는
      // 것은 네트워크·HTTP 실패뿐이다. 조회 실패의 실제 신호는 0 이고, 그것을 걸러내는
      // 것은 savedBookMessage 의 `< 1` 검사다.
      // 재독이면 savedBookMessage 가 회독 문구로 즉시 반환해 이 값을 버리므로,
      // 책 목록 전체를 가져오는 호출 자체를 건너뛴다(조건은 그 재독 분기의 반대).
      let completedCount: number | null = null;
      if (readCount <= 1) {
        try {
          const stats = await bookApi.getBookStats();
          completedCount = stats.totalCompletedBooks;
        } catch (err) {
          console.warn('완독 권수 조회 실패:', err);
        }
      }

      setSaved({ book: result, completedCount, readCount });
      // 이 완독으로 새 뱃지를 받았으면 결과 카드 위로 축하 토스트 — 기다리지 않는다
      void notifyNewBadges(result.id, router.push);
      // 같은 배치에서 풀어야 한다 — setSaved 로 폼이 언마운트되는 렌더에 함께 커밋되므로
      // 버튼이 되살아나 보이는 중간 렌더가 없다. 반대로 여기서 풀지 않으면
      // `한 권 더 기록` 으로 돌아온 다음 폼의 등록 버튼이 죽은 채로 남는다.
      setIsFinishing(false);
    } else {
      toast.error('도서 등록에 실패했습니다.');
    }
  };

  const handleCancel = () => {
    setSelectedBook(null);
  };

  const handleRecordAnother = () => {
    setSaved(null);
    setSelectedBook(null);
    setManualDraft(EMPTY_MANUAL_BOOK);
    if (isManual) closeManual();
  };

  return (
    <ErrorBoundary>
      <PageContainer>
        <div className='mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2'>
          <h1 className='heading-1'>도서 추가</h1>
          <div className='flex flex-wrap items-center gap-4'>
            <Link
              href='/books/requests'
              className='text-sm text-primary underline'
            >
              내 등록 요청
            </Link>
            <Link
              href='/books/import'
              className='text-sm text-text-subtle underline underline-offset-4'
            >
              여러 권 한 번에 담기
            </Link>
          </div>
        </div>

        {saved ? (
          <BookSavedCard
            title={saved.book.title}
            coverImage={saved.book.cover_image}
            oneLineReview={saved.book.one_line_review}
            rating={saved.book.rating}
            isLifeBook={saved.book.is_life_book}
            completedCount={saved.completedCount}
            readCount={saved.readCount}
            onGoToLibrary={() => router.push('/books')}
            onRecordAnother={handleRecordAnother}
          />
        ) : isManual ? (
          /* 직접 등록 — 검색·바코드 없이 책 정보와 독서 기록을 한 폼에서 */
          <BookRegistrationForm
            book={EMPTY_PROVIDER_BOOK}
            heading='직접 등록'
            bookSection={
              <ManualBookFields value={manualDraft} onChange={setManualDraft} />
            }
            initialStatus={initialStatus}
            onSubmit={handleManualSubmit}
            onCancel={closeManual}
            isLoading={isUploadingCover || isCreating || isFinishing}
          />
        ) : !selectedBook ? (
          <div className='space-y-6'>
            {/* 검색 입력 */}
            <BookSearchInput
              // 스캔할 때마다 ISBN 을 채운 새 검색창으로 다시 마운트한다
              key={scannedIsbn ?? 'search'}
              initialQuery={scannedIsbn ?? undefined}
              ref={searchInputRef}
              onSearch={handleSearch}
              isLoading={isSearching}
              onScanClick={() => setIsScanOpen(true)}
            />

            {/* 로딩 상태 */}
            {isScanLookup ? (
              <p className='text-center text-muted-foreground'>
                바코드로 찾은 책을 불러오는 중...
              </p>
            ) : (
              isSearching && (
                <p className='text-center text-muted-foreground'>검색 중...</p>
              )
            )}

            {!isSearching && !isScanLookup && catalogBooks.length > 0 && (
              <section className='space-y-3'>
                <h2 className='text-sm font-medium'>
                  검수 승인된 직접 등록 도서
                </h2>
                <div className='divide-y divide-line-soft border-t border-line'>
                  {catalogBooks.map((book) => (
                    <BookSearchResultCard
                      key={book.isbn}
                      book={book}
                      onSelect={handleSelectBook}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 검색 결과 — 행 리스트를 카드 하나에 담는다 */}
            {!isSearching && !isScanLookup && books.length > 0 && (
              <div className='space-y-3'>
                <div className='flex flex-wrap items-baseline justify-between gap-x-3'>
                  <p className='text-sm text-text-subtle'>
                    서점 검색 결과 {books.length}권
                  </p>
                  {/*
                    검색 결과는 공급자 데이터를 그대로 보여주는 화면이라 출처 표기가
                    필요하다(약관 의무). 결과마다 붙이면 시끄러우므로 목록에 한 줄로 둔다.
                    첫 결과의 출처를 쓴다 — 한 번의 검색은 한 공급자에서만 온다.
                  */}
                  <BookSourceCredit
                    source={books[0]?.source}
                    providerItemId={books[0]?.providerItemId}
                    isbn={books[0]?.isbn ?? ''}
                  />
                </div>
                <div className='divide-y divide-line-soft border-t border-line'>
                  {books.map((book) => (
                    <BookSearchResultCard
                      key={book.isbn}
                      book={book}
                      onSelect={handleSelectBook}
                    />
                  ))}
                </div>
              </div>
            )}

            {!isSearching && !isScanLookup && totalResults > itemsPerPage && (
              <BookSearchPagination
                currentPage={currentPage}
                totalResults={totalResults}
                itemsPerPage={itemsPerPage}
                onPageChange={goToPage}
              />
            )}

            {/* 검색 결과 없음 */}
            {!isSearching &&
              !isScanLookup &&
              books.length === 0 &&
              catalogBooks.length === 0 && (
                <p className='text-center text-muted-foreground'>
                  {lastQuery
                    ? `'${lastQuery}'(으)로 찾은 책이 없어요`
                    : '도서 제목을 검색해주세요'}
                </p>
              )}

            {/* 직접 등록 입구 — 검색을 먼저 해 보고, 없을 때 내려오는 자리라 결과 아래에 둔다 */}
            {!isSearching && !isScanLookup && (
              <div className='flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-line pt-5 text-sm text-text-subtle'>
                <span>찾는 책이 없나요?</span>
                <Button type='button' variant='outline' onClick={openManual}>
                  직접 등록하기
                </Button>
              </div>
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
                initialStatus={initialStatus}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isLoading={isCreating || isFinishing}
              />
            )}
          </>
        )}
      </PageContainer>

      <BarcodeScanDialog
        open={isScanOpen}
        onOpenChange={setIsScanOpen}
        onDetected={handleScanned}
      />

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

const AddBookRoute = () => (
  <Suspense
    fallback={
      <p className='p-6 text-text-subtle'>책 검색을 준비하고 있어요…</p>
    }
  >
    <AddBookPage />
  </Suspense>
);
export default AddBookRoute;
