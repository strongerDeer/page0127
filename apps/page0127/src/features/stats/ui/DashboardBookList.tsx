'use client';

import { useEffect, useRef, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { mapToMainCategory } from '@/shared/lib/categoryMapper';
import { Button } from '@/shared/ui/button';
import { ReadCountBadge } from '@/shared/ui/ReadCountBadge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';

import { BookSearchInput, type BookSearchInputHandle } from './BookSearchInput';
import { CategoryFilter } from './CategoryFilter';

import type { Book, BookStatus } from '@/entities/book/types';
import type { CategoryReadingData } from '@/entities/book/types/stats';

type DashboardBookListProps = {
  /** 완독한 책 목록 */
  books: Book[];

  /** 카테고리별 독서량 */
  categories: CategoryReadingData[];

  /** 섹션 제목 (기본값: "Recent Books") */
  title?: string;

  /** 책 클릭 시 이동할 URL 생성 함수 (기본값: /books/${id}) */
  bookHref?: (book: Book) => string;

  /** 선택된 월 (1-12, null = 전체) — 차트 연동 없는 경우 생략 가능 */
  selectedMonth?: number | null;

  /** 선택된 카테고리 */
  selectedCategory: string | null;

  /** 선택된 평점 (1-5, null = 전체) — 차트 연동 없는 경우 생략 가능 */
  selectedRating?: number | null;

  /** 검색어 */
  searchQuery: string;

  /** 상태 필터 (전체/완독/읽는 중/읽고 싶은)
   *  부모 reducer에서 관리 → RESET_ALL 한 번으로 전체 초기화 가능 */
  statusFilter: BookStatus | 'all';

  /** 카테고리 선택 핸들러 */
  onCategoryChange: (category: string | null) => void;

  /** 월 필터 제거 핸들러 — selectedMonth 사용 시 필수 */
  onRemoveMonthFilter?: () => void;

  /** 평점 필터 제거 핸들러 — selectedRating 사용 시 필수 */
  onRemoveRatingFilter?: () => void;

  /** 검색어 변경 핸들러 */
  onSearchChange: (query: string) => void;

  /** 상태 필터 변경 핸들러 */
  onStatusChange: (status: BookStatus | 'all') => void;

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
  title = 'Recent Books',
  bookHref = (book) => `/books/${book.id}`,
  selectedMonth = null,
  selectedCategory,
  selectedRating = null,
  searchQuery,
  statusFilter,
  onCategoryChange,
  onRemoveMonthFilter,
  onRemoveRatingFilter,
  onSearchChange,
  onStatusChange,
  renderBooks,
  onResetAll,
  showViewAll = false,
}: DashboardBookListProps) => {
  const BOOKS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  // 실험 2: useImperativeHandle — 부모에서 검색창 메서드 호출
  const searchRef = useRef<BookSearchInputHandle>(null);

  // Escape 단축키: useImperativeHandle이 노출한 clear()를 외부에서 호출
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') searchRef.current?.clear();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // searchQuery가 ''으로 초기화되면 검색 input 표시값도 같이 초기화
  // (BookSearchInput은 자체 inputValue state를 가지므로 ref로 직접 호출)
  useEffect(() => {
    if (searchQuery === '') searchRef.current?.clear();
  }, [searchQuery]);

  // 정렬 (최신순/오래된순/별점높은순/별점낮은순/제목순)
  const [sortOption, setSortOption] = useState<string>(
    () =>
      (typeof window !== 'undefined'
        ? localStorage.getItem('dashboard-sort-option')
        : null) || 'created_at-desc'
  );

  // 월별 + 카테고리 + 평점 + 상태 + 검색어 복합 필터 적용
  const filteredBooks = books
    .filter((book) => {
      // 1. 상태 필터 확인
      if (statusFilter !== 'all' && book.status !== statusFilter) {
        return false;
      }

      // 2. 월 필터 확인 (완독한 책만)
      if (selectedMonth !== null && book.completed_date) {
        const completedDate = new Date(book.completed_date);
        const bookMonth = completedDate.getMonth() + 1; // 0-11 → 1-12
        if (bookMonth !== selectedMonth) return false;
      }

      // 3. 카테고리 필터 확인
      if (selectedCategory !== null) {
        const mainCategory = mapToMainCategory(book.category);
        if (mainCategory !== selectedCategory) return false;
      }

      // 4. 평점 필터 확인
      if (selectedRating !== null) {
        if (book.rating !== selectedRating) return false;
      }

      // 5. 검색어 필터 확인 (제목 + 저자)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
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
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
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
  const handleCategoryChange = (category: string | null) => {
    setCurrentPage(1);
    onCategoryChange(category);
  };

  const handleRemoveMonthFilter = () => {
    setCurrentPage(1);
    onRemoveMonthFilter?.();
  };

  const handleStatusChange = (status: BookStatus | 'all') => {
    setCurrentPage(1);
    onStatusChange(status);
  };

  const handleSortChange = (option: string) => {
    setCurrentPage(1);
    setSortOption(option);
    localStorage.setItem('dashboard-sort-option', option);
  };

  const handleSearchChange = (query: string) => {
    setCurrentPage(1);
    onSearchChange(query);
  };

  return (
    <div>
      {/* 검색창 */}
      <div className='mb-4'>
        <BookSearchInput
          ref={searchRef}
          onSearchChange={handleSearchChange}
          placeholder='제목이나 저자로 검색하세요'
        />
      </div>

      {/* 상태별 탭 */}
      <div className='mb-6 flex flex-wrap gap-2'>
        <button
          onClick={() => handleStatusChange('all')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          전체
        </button>
        <button
          onClick={() => handleStatusChange('completed')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            statusFilter === 'completed'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          완독
        </button>
        <button
          onClick={() => handleStatusChange('reading')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            statusFilter === 'reading'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          읽는 중
        </button>
        <button
          onClick={() => handleStatusChange('want_to_read')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            statusFilter === 'want_to_read'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          읽고 싶은
        </button>

        {/* 정렬 옵션 */}
        <div className='ml-auto'>
          <Select value={sortOption} onValueChange={handleSortChange}>
            <SelectTrigger className='w-[160px]'>
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
      </div>

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
            {title} ({filteredBooks.length})
          </h3>
          <div className='flex items-center gap-3'>
            {/* 필터가 하나라도 활성화됐을 때만 초기화 버튼 표시 */}
            {onResetAll &&
              (selectedMonth !== null ||
                selectedCategory !== null ||
                selectedRating !== null ||
                searchQuery !== '' ||
                statusFilter !== 'all') && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={onResetAll}
                  className='text-slate-500 hover:text-slate-800'
                >
                  필터 초기화
                </Button>
              )}
            {showViewAll && (
              <Link
                href='/books?status=completed'
                className='text-sm text-emerald-600 hover:text-emerald-700'
              >
                전체 보기 →
              </Link>
            )}
          </div>
        </div>

        {/* 책 목록 — renderBooks가 있으면 커스텀 렌더링, 없으면 기본 그리드 */}
        {filteredBooks.length > 0 ? (
          <>
            {renderBooks ? (
              // 커스텀 렌더러: 선반 레이아웃 등 외부에서 주입
              renderBooks(filteredBooks)
            ) : (
              <div className='grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'>
                {paginatedBooks.map((book) => (
                  <Link
                    key={book.id}
                    href={bookHref(book)}
                    className='group transition-transform hover:scale-105'
                  >
                    <div className='aspect-2/3 relative overflow-hidden rounded-lg bg-gray-100 shadow-md'>
                      {book.cover_image ? (
                        <Image
                          src={book.cover_image}
                          alt={book.title}
                          fill
                          sizes='(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw'
                          className='object-cover'
                        />
                      ) : (
                        <div className='flex h-full w-full items-center justify-center text-4xl'>
                          📚
                        </div>
                      )}
                      {book.read_count > 1 && (
                        <div className='absolute right-2 top-2'>
                          <ReadCountBadge
                            readCount={book.read_count}
                            size='sm'
                          />
                        </div>
                      )}
                    </div>
                    <p className='mt-2 line-clamp-2 text-xs text-gray-700 group-hover:text-emerald-600'>
                      {book.title}
                    </p>
                  </Link>
                ))}
              </div>
            )}

            {/* 페이지네이션 — 커스텀 렌더러 사용 시 숨김 */}
            {!renderBooks && totalPages > 1 && (
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
