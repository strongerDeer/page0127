'use client';

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react';

import Link from 'next/link';

import { LayoutGrid, Library, Search, SearchX, SlidersHorizontal, X } from 'lucide-react';

import { mapToMainCategory } from '@/shared/lib/categoryMapper';
import { useLocalStorage } from '@/shared/lib/hooks/useLocalStorage';
import { Button } from '@/shared/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';

import { BookFeedGrid } from './BookFeedGrid';
import { BookGridItem } from './BookGridItem';
import { BookListFilterInput, type BookListFilterInputHandle } from './BookListFilterInput';
import { CategoryFilter } from './CategoryFilter';

import type { Book } from '@/entities/book';
import type { CategoryReadingData } from '@/entities/book';

type DashboardBookListProps = {
  /** 완독한 책 목록 */
  books: Book[];

  /** 카테고리별 독서량 */
  categories: CategoryReadingData[];

  /** 섹션 제목 (기본값: "책") */
  title?: string;

  /** 책 클릭 시 이동할 URL 생성 함수 (기본값: /books/${id}) */
  bookHref?: (book: Book) => string;

  /** 선택된 월 (1-12, null = 전체) — 차트 연동 없는 경우 생략 가능 */
  selectedMonth?: number | null;

  /** 선택된 카테고리들 */
  selectedCategories: string[];

  /** 선택된 평점 (1-5, null = 전체) — 차트 연동 없는 경우 생략 가능 */
  selectedRating?: number | null;

  /** 검색어 */
  searchQuery: string;

  /** 카테고리 다중 선택 핸들러 */
  onCategoriesChange: (categories: string[]) => void;

  /** 월 필터 제거 핸들러 — selectedMonth 사용 시 필수 */
  onRemoveMonthFilter?: () => void;

  /** 평점 필터 제거 핸들러 — selectedRating 사용 시 필수 */
  onRemoveRatingFilter?: () => void;

  /** 검색어 변경 핸들러 */
  onSearchChange: (query: string) => void;

  /** 책 목록 커스텀 렌더러 — 제공 시 기본 그리드 대신 사용
   *  filteredBooks(필터 적용된 전체 목록)를 받아 ReactNode 반환
   *  예: 선반(shelf) 레이아웃, 테이블 뷰 등 */
  renderBooks?: (filteredBooks: Book[]) => React.ReactNode;

  /** 전체 필터 초기화 핸들러 — 제공 시 필터 활성화 상태에서 초기화 버튼 표시 */
  onResetAll?: () => void;

  /** "전체 보기 →" 링크 표시 여부 (기본값: false) */
  showViewAll?: boolean;
};

/**
 * 대시보드 책 목록 섹션 (Client Component)
 *
 * 학습 포인트:
 * - 월별 + 카테고리 + 평점 + 검색어 복합 필터링
 * - 부모 컴포넌트에서 상태 관리 (lift state up)
 * - 필터 뱃지로 현재 필터 표시
 * - 책 표지 그리드 레이아웃
 * - 제목/저자 검색 (대소문자 무시)
 */
export const DashboardBookList = ({
  books,
  categories,
  title = '책',
  bookHref = (book) => `/books/${book.id}`,
  selectedMonth = null,
  selectedCategories,
  selectedRating = null,
  searchQuery,
  onCategoriesChange,
  onRemoveMonthFilter,
  onRemoveRatingFilter,
  onSearchChange,
  renderBooks,
  onResetAll,
  showViewAll = false,
}: DashboardBookListProps) => {
  const BOOKS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // searchQuery는 부모 props로 받으므로 직접 setState 불가 → useDeferredValue
  // 타이핑 즉시 input에 반영되고, 목록 필터링은 한 박자 늦게 처리
  const deferredSearchQuery = useDeferredValue(searchQuery);
  // 아직 deferredSearchQuery가 searchQuery를 따라잡지 못한 상태
  const isSearchStale = searchQuery !== deferredSearchQuery;

  // 탭/카테고리/정렬 변경은 목록 재계산을 유발하지만 급하지 않음 → useTransition
  // isPending: 전환 중임을 탭 버튼에 표시할 수 있음
  const [, startTabTransition] = useTransition();

  // 실험 2: useImperativeHandle — 부모에서 검색창 메서드 호출
  const searchRef = useRef<BookListFilterInputHandle>(null);

  // Escape 단축키: useImperativeHandle이 노출한 clear()를 외부에서 호출
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') searchRef.current?.clear();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // searchQuery가 ''으로 초기화되면 검색 input 표시값도 같이 초기화
  // (BookListFilterInput은 자체 inputValue state를 가지므로 ref로 직접 호출)
  useEffect(() => {
    if (searchQuery === '') searchRef.current?.clear();
  }, [searchQuery]);

  // 정렬 (최신순/오래된순/별점높은순/별점낮은순/제목순)
  const [sortOption, setSortOption] = useLocalStorage<string>(
    'dashboard-sort-option',
    'created_at-desc'
  );

  // 책장형(선반)/피드형(번호 붙은 카드 그리드) 토글 — 내 서재·공개 서재 공용 컴포넌트라
  // 여기서 저장하면 두 화면 모두 같은 값을 공유한다
  const [viewMode, setViewMode] = useLocalStorage<'shelf' | 'feed'>(
    'library-view-mode',
    'shelf'
  );

  // 피드형 "BOOK #번호"는 검색/카테고리 필터와 무관하게 고정되어야 한다 →
  // 필터 적용 전 원본 books(완독 책만 들어온다)를 완독일 오름차순으로 정렬해 번호를 매긴다.
  // (React Compiler가 자동 메모이제이션하므로 수동 useMemo는 쓰지 않는다)
  const rankMap = new Map<string, number>();
  [...books]
    .sort((a, b) => {
      const dateA = new Date(a.completed_date ?? a.created_at).getTime();
      const dateB = new Date(b.completed_date ?? b.created_at).getTime();
      return dateA - dateB;
    })
    .forEach((book, index) => rankMap.set(book.id, index + 1));

  // React Compiler 자동 메모이제이션 → 손으로 쓰던 useMemo·deps 배열 제거 (Day 65)
  // Compiler가 books·필터 조건 의존성을 자동 추적해 같은 입력이면 캐시 반환한다
  const filteredBooks = books
    .filter((book) => {
      // 1. 월 필터 확인 (완독한 책만)
      if (selectedMonth !== null && book.completed_date) {
        const completedDate = new Date(book.completed_date);
        const bookMonth = completedDate.getMonth() + 1; // 0-11 → 1-12
        if (bookMonth !== selectedMonth) return false;
      }

      // 2. 카테고리 필터 확인
      if (selectedCategories.length > 0) {
        const mainCategory = mapToMainCategory(book.category);
        if (!selectedCategories.includes(mainCategory)) return false;
      }

      // 3. 평점 필터 확인
      if (selectedRating !== null) {
        if (book.rating !== selectedRating) return false;
      }

      // 4. 검색어 필터 확인 (제목 + 저자)
      // deferredSearchQuery: 타이핑 중에는 이전 값 유지 → 목록 필터링이 input을 막지 않음
      if (deferredSearchQuery.trim()) {
        const query = deferredSearchQuery.toLowerCase();
        const titleMatch = book.title.toLowerCase().includes(query);
        const authorMatch = book.author?.toLowerCase().includes(query) ?? false;

        if (!titleMatch && !authorMatch) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // 정렬 로직
      const [field, order] = sortOption.split('-');

      if (field === 'created_at') {
        // '최신순'/'오래된순'은 등록 시각이 아니라 완독일 기준이어야 한다.
        // completed_date가 없는 예외 케이스만 created_at으로 대체한다.
        const dateA = new Date(a.completed_date ?? a.created_at).getTime();
        const dateB = new Date(b.completed_date ?? b.created_at).getTime();
        return order === 'desc' ? dateB - dateA : dateA - dateB;
      }

      if (field === 'rating') {
        const ratingA = a.rating ?? 0;
        const ratingB = b.rating ?? 0;
        return order === 'desc' ? ratingB - ratingA : ratingA - ratingB;
      }

      if (field === 'title') {
        return order === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }

      return 0;
    });

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredBooks.length / BOOKS_PER_PAGE);
  const startIndex = (currentPage - 1) * BOOKS_PER_PAGE;
  const endIndex = startIndex + BOOKS_PER_PAGE;
  const paginatedBooks = filteredBooks.slice(startIndex, endIndex);

  // 학습 포인트: useEffect에서 setState를 직접 호출하는 대신
  // 이벤트 핸들러에서 처리

  // 필터 변경 시 첫 페이지로 이동
  // setCurrentPage(1)은 즉시 — 탭 UI 반응은 빠르게
  // onCategoriesChange/setSortOption은 transition 안 — 목록 재계산은 급하지 않음
  const handleCategoriesChange = (categories: string[]) => {
    setCurrentPage(1);
    startTabTransition(() => onCategoriesChange(categories));
  };

  const handleRemoveMonthFilter = () => {
    setCurrentPage(1);
    onRemoveMonthFilter?.();
  };

  const handleSortChange = (option: string) => {
    setCurrentPage(1);
    startTabTransition(() => setSortOption(option));
  };

  const handleResetAll = () => {
    setCurrentPage(1);
    onResetAll?.();
  };

  // BookListFilterInput의 useEffect deps에 들어가므로 참조를 안정화 (useCallback)
  const handleSearchChange = useCallback(
    (query: string) => {
      setCurrentPage(1);
      onSearchChange(query);
    },
    [onSearchChange]
  );

  const activeFilterCount = [
    selectedMonth !== null,
    ...selectedCategories.map(() => true),
    selectedRating !== null,
  ].filter(Boolean).length;

  return (
    <div>
      {/* 책을 먼저 보이게 하는 최소 툴바. 상세 조건은 필요할 때만 펼친다. */}
      <div className='mb-4 flex flex-wrap items-center gap-2'>
        <h3 className='mr-auto text-lg font-semibold text-text-strong'>
          {title}{' '}
          <span className='font-normal text-text-subtle'>
            {filteredBooks.length}권
          </span>
        </h3>

        {showViewAll && (
          <Link
            href='/books?status=completed'
            className='mr-1 text-sm text-primary hover:text-primary/80'
          >
            전체 보기
          </Link>
        )}

        <Button
          variant='ghost'
          size='sm'
          onClick={() => setIsSearchOpen((open) => !open)}
          aria-expanded={isSearchOpen}
          className={searchQuery ? 'text-primary' : 'text-text-body'}
        >
          <Search className='h-4 w-4' />
          <span className='hidden sm:inline'>검색</span>
        </Button>

        <Popover open={isFilterPanelOpen} onOpenChange={setIsFilterPanelOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              className={activeFilterCount ? 'text-primary' : 'text-text-body'}
            >
              <SlidersHorizontal className='h-4 w-4' />
              필터
              {activeFilterCount > 0 && (
                <span className='flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground'>
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent
            align='end'
            sideOffset={8}
            className='w-[min(92vw,24rem)] p-4'
          >
            <div className='mb-4 flex items-center justify-between'>
              <div>
                <h4 className='text-sm font-semibold text-text-strong'>필터</h4>
                <p className='mt-0.5 text-xs text-text-subtle'>
                  카테고리는 여러 개 선택할 수 있어요.
                </p>
              </div>
              {onResetAll && activeFilterCount > 0 && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleResetAll}
                  className='h-7 px-2 text-xs text-text-subtle hover:text-text-strong'
                >
                  초기화
                </Button>
              )}
            </div>

            <div className='space-y-4'>
              <CategoryFilter
                categories={categories}
                selectedCategories={selectedCategories}
                onSelectionChange={handleCategoriesChange}
              />
            </div>
          </PopoverContent>
        </Popover>

        <div className='flex items-center gap-0.5 rounded-md border border-line-soft p-0.5'>
          <Button
            variant={viewMode === 'shelf' ? 'secondary' : 'ghost'}
            size='sm'
            className='h-7 px-2'
            aria-pressed={viewMode === 'shelf'}
            onClick={() => setViewMode('shelf')}
          >
            <Library className='h-4 w-4' />
          </Button>
          <Button
            variant={viewMode === 'feed' ? 'secondary' : 'ghost'}
            size='sm'
            className='h-7 px-2'
            aria-pressed={viewMode === 'feed'}
            onClick={() => setViewMode('feed')}
          >
            <LayoutGrid className='h-4 w-4' />
          </Button>
        </div>

        <Select value={sortOption} onValueChange={handleSortChange}>
          <SelectTrigger className='w-[105px] border-0 bg-transparent px-2 shadow-none sm:w-[120px]'>
            <SelectValue placeholder='정렬 선택' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='created_at-desc'>최신순</SelectItem>
            <SelectItem value='created_at-asc'>오래된순</SelectItem>
            <SelectItem value='rating-desc'>별점 높은순</SelectItem>
            <SelectItem value='rating-asc'>별점 낮은순</SelectItem>
            <SelectItem value='title-asc'>제목순 (ㄱ-ㅎ)</SelectItem>
            <SelectItem value='title-desc'>제목순 (ㅎ-ㄱ)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isSearchOpen && (
        <div className='mb-4 border-y border-line-soft py-3'>
          <div className='max-w-sm'>
            <BookListFilterInput
              ref={searchRef}
              onSearchChange={handleSearchChange}
              placeholder='제목이나 저자로 검색'
            />
          </div>
        </div>
      )}

      {/* 적용된 조건만 한 줄로 남기고, 필터 목록은 감춘다. */}
      {(activeFilterCount > 0 || searchQuery !== '') && (
        <div className='mb-4 flex flex-wrap items-center gap-2'>
          {selectedMonth !== null && (
            <button
              onClick={handleRemoveMonthFilter}
              className='flex items-center gap-1 rounded-full bg-sunken px-3 py-1 text-sm text-text-body hover:text-text-strong'
            >
              {selectedMonth}월 <X className='h-3.5 w-3.5' />
            </button>
          )}
          {selectedCategories.length > 0 && (
            <button
              onClick={() => handleCategoriesChange([])}
              className='flex items-center gap-1 rounded-full bg-sunken px-3 py-1 text-sm text-text-body hover:text-text-strong'
            >
              {selectedCategories[0]}
              {selectedCategories.length > 1 &&
                ` 외 ${selectedCategories.length - 1}개`}{' '}
              <X className='h-3.5 w-3.5' />
            </button>
          )}
          {selectedRating !== null && (
            <button
              onClick={onRemoveRatingFilter}
              className='flex items-center gap-1 rounded-full bg-sunken px-3 py-1 text-sm text-text-body hover:text-text-strong'
            >
              {selectedRating}점 <X className='h-3.5 w-3.5' />
            </button>
          )}
          {searchQuery !== '' && (
            <button
              onClick={() => handleSearchChange('')}
              className='flex items-center gap-1 rounded-full bg-sunken px-3 py-1 text-sm text-text-body hover:text-text-strong'
            >
              “{searchQuery}” <X className='h-3.5 w-3.5' />
            </button>
          )}
        </div>
      )}

      {/* 읽은 책 목록 */}
      <div>

        {/* 책 목록 — renderBooks가 있으면 커스텀 렌더링, 없으면 기본 그리드 */}
        {/* isSearchStale: 타이핑 중 아직 반영 안 된 상태 → 흐리게 표시 */}
        {filteredBooks.length > 0 ? (
          <div
            style={{
              opacity: isSearchStale ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {viewMode === 'feed' ? (
              <BookFeedGrid
                books={filteredBooks}
                rankMap={rankMap}
                bookHref={bookHref}
              />
            ) : renderBooks ? (
              // 커스텀 렌더러: 선반 레이아웃 등 외부에서 주입
              renderBooks(filteredBooks)
            ) : (
              <div className='grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'>
                {paginatedBooks.map((book) => (
                  // key는 사용처에서 부여 (memo로 감싼 컴포넌트도 동일)
                  <BookGridItem
                    key={book.id}
                    book={book}
                    href={bookHref(book)}
                  />
                ))}
              </div>
            )}

            {/* 페이지네이션 — 커스텀 렌더러 사용 시 숨김 */}
            {viewMode === 'shelf' && !renderBooks && totalPages > 1 && (
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
          </div>
        ) : (
          <div className='rounded-xl bg-card p-12 text-center'>
            <SearchX className='mx-auto mb-2 h-8 w-8 text-text-faint' />
            <p className='text-sm text-text-body'>
              {selectedCategories.length > 0
                ? `선택한 카테고리에 해당하는 책이 없어요.`
                : '조건에 맞는 책이 없어요.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
