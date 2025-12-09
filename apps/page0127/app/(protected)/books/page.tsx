'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { toast } from 'sonner';

import { Button } from '@/shared/ui/button';
import { DeleteConfirmDialog } from '@/shared/ui/DeleteConfirmDialog';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';

import { useBookCRUD } from '@/features/book/api/useBookCRUD';
import { BookCard } from '@/features/book/ui/BookCard';
import { BookCardSkeleton } from '@/features/book/ui/BookCardSkeleton';

import type { Book, BookStatus } from '@/entities/book/types';

/**
 * 도서 목록 페이지
 *
 * 학습 포인트:
 * - useEffect로 데이터 로딩
 * - 탭으로 상태별 필터링
 * - Select로 정렬 기능
 * - 삭제 기능 구현
 * - Error Boundary로 에러 처리
 * - URL 쿼리 파라미터로 필터링 (차트 클릭 시)
 */
const BooksPage = () => {
  const searchParams = useSearchParams();
  const { getMyBooks, deleteBook, isLoading } = useBookCRUD();
  const [books, setBooks] = useState<Book[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | BookStatus>('all');
  const [sortOption, setSortOption] = useState<string>('created_at-desc');
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);

  // URL 쿼리 파라미터에서 필터 값 가져오기
  const monthFilter = searchParams.get('month');
  const categoryFilter = searchParams.get('category');

  // 도서 목록 로딩 함수
  const loadBooks = async () => {
    const status = activeTab === 'all' ? undefined : activeTab;
    const [sortBy, order] = sortOption.split('-');
    const data = await getMyBooks(status, sortBy, order as 'asc' | 'desc');
    setBooks(data);
  };

  // 필터링된 책 목록 계산
  const filteredBooks = books.filter((book) => {
    // 월별 필터 적용 (완독일 기준)
    if (monthFilter && book.completed_date) {
      const completedMonth = new Date(book.completed_date).getMonth() + 1;
      if (completedMonth !== Number(monthFilter)) {
        return false;
      }
    }

    // 카테고리 필터 적용
    if (categoryFilter && book.category !== categoryFilter) {
      return false;
    }

    return true;
  });

  // 페이지 로드 시 도서 목록 가져오기
  useEffect(() => {
    loadBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sortOption]);

  const handleDelete = (id: string) => {
    setDeletingBookId(id);
  };

  const confirmDelete = async () => {
    if (!deletingBookId) return;

    const success = await deleteBook(deletingBookId);
    if (success) {
      toast.success('도서가 삭제되었습니다.');
      // 목록 새로고침
      loadBooks();
    } else {
      toast.error('도서 삭제에 실패했습니다.');
    }
    setDeletingBookId(null);
  };

  const tabs = [
    { key: 'all' as const, label: '전체' },
    { key: 'completed' as const, label: '완독' },
    { key: 'reading' as const, label: '읽는 중' },
    { key: 'want_to_read' as const, label: '읽고 싶은 책' },
  ];

  // 정렬 옵션
  const sortOptions = [
    { value: 'created_at-desc', label: '최신순' },
    { value: 'created_at-asc', label: '오래된순' },
    { value: 'rating-desc', label: '별점 높은순' },
    { value: 'rating-asc', label: '별점 낮은순' },
    { value: 'title-asc', label: '제목순 (ㄱ-ㅎ)' },
  ];

  return (
    <ErrorBoundary>
      <div className='min-h-screen bg-gray-50 p-8'>
        <div className='mx-auto max-w-6xl'>
          {/* 헤더 */}
          <div className='mb-6 flex items-center justify-between'>
            <h1 className='text-3xl font-bold'>내 서재</h1>
            <Link href='/books/add'>
              <Button>도서 추가</Button>
            </Link>
          </div>

          {/* 탭 */}
          <div className='mb-6 flex gap-2 border-b'>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 활성 필터 표시 */}
          {(monthFilter || categoryFilter) && (
            <div className='mb-4 flex items-center gap-2'>
              <span className='text-sm text-gray-600'>활성 필터:</span>
              {monthFilter && (
                <div className='flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800'>
                  {monthFilter}월
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.delete('month');
                      window.location.href = `/books?${params.toString()}`;
                    }}
                    className='ml-1 text-blue-600 hover:text-blue-900'
                  >
                    ✕
                  </button>
                </div>
              )}
              {categoryFilter && (
                <div className='flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm text-green-800'>
                  {categoryFilter}
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.delete('category');
                      window.location.href = `/books?${params.toString()}`;
                    }}
                    className='ml-1 text-green-600 hover:text-green-900'
                  >
                    ✕
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  window.location.href = '/books';
                }}
                className='ml-2 text-sm text-gray-500 hover:text-gray-700'
              >
                전체 초기화
              </button>
            </div>
          )}

          {/* 정렬 선택 */}
          <div className='mb-4 flex items-center justify-between'>
            <p className='text-sm text-gray-600'>
              총 {filteredBooks.length}권의 도서
              {filteredBooks.length !== books.length &&
                ` (전체 ${books.length}권)`}
            </p>
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className='w-[180px]'>
                <SelectValue placeholder='정렬 기준' />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 로딩 상태 - 스켈레톤 */}
          {isLoading && (
            <div className='space-y-4'>
              {[1, 2, 3].map((i) => (
                <BookCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* 도서 목록 */}
          {!isLoading && filteredBooks.length > 0 && (
            <div className='space-y-4'>
              {filteredBooks.map((book) => (
                <BookCard key={book.id} book={book} onDelete={handleDelete} />
              ))}
            </div>
          )}

          {/* 삭제 확인 다이얼로그 */}
          <DeleteConfirmDialog
            isOpen={!!deletingBookId}
            onClose={() => setDeletingBookId(null)}
            onConfirm={confirmDelete}
            title='도서를 삭제하시겠습니까?'
            description='삭제된 도서는 복구할 수 없습니다.'
          />

          {/* 도서 없음 */}
          {!isLoading && filteredBooks.length === 0 && books.length > 0 && (
            <div className='rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center'>
              <div className='mx-auto mb-4 text-6xl'>🔍</div>
              <h3 className='mb-2 text-lg font-semibold text-gray-900'>
                필터 조건에 맞는 도서가 없습니다
              </h3>
              <p className='mb-6 text-sm text-gray-500'>
                다른 필터를 선택하거나 전체 목록을 확인해보세요.
              </p>
              <Button
                onClick={() => {
                  window.location.href = '/books';
                }}
                variant='outline'
              >
                전체 도서 보기
              </Button>
            </div>
          )}

          {/* 등록된 도서 없음 */}
          {!isLoading && books.length === 0 && (
            <div className='rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center'>
              <div className='mx-auto mb-4 text-6xl'>📚</div>
              <h3 className='mb-2 text-lg font-semibold text-gray-900'>
                등록된 도서가 없습니다
              </h3>
              <p className='mb-6 text-sm text-gray-500'>
                {activeTab === 'all'
                  ? '첫 번째 도서를 추가해보세요!'
                  : `${tabs.find((t) => t.key === activeTab)?.label} 상태의 도서가 없습니다.`}
              </p>
              <Link href='/books/add'>
                <Button>첫 도서 추가하기</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default BooksPage;
