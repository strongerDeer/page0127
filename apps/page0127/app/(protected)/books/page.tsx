'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

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
 */
const BooksPage = () => {
  const { getMyBooks, deleteBook, isLoading } = useBookCRUD();
  const [books, setBooks] = useState<Book[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | BookStatus>('all');
  const [sortOption, setSortOption] = useState<string>('created_at-desc');
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);

  // 도서 목록 로딩 함수
  const loadBooks = async () => {
    const status = activeTab === 'all' ? undefined : activeTab;
    const [sortBy, order] = sortOption.split('-');
    const data = await getMyBooks(status, sortBy, order as 'asc' | 'desc');
    setBooks(data);
  };

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

          {/* 정렬 선택 */}
          <div className='mb-4 flex items-center justify-between'>
            <p className='text-sm text-gray-600'>총 {books.length}권의 도서</p>
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
          {!isLoading && books.length > 0 && (
            <div className='space-y-4'>
              {books.map((book) => (
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
