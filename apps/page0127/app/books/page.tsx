'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { Button } from '@/shared/ui/button';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

import { useBookCRUD } from '@/features/book/api/useBookCRUD';
import { BookCard } from '@/features/book/ui/BookCard';

import type { Book, BookStatus } from '@/entities/book/types';

/**
 * 도서 목록 페이지
 *
 * 학습 포인트:
 * - useEffect로 데이터 로딩
 * - 탭으로 상태별 필터링
 * - 삭제 기능 구현
 * - Error Boundary로 에러 처리
 */
const BooksPage = () => {
  const { getMyBooks, deleteBook, isLoading } = useBookCRUD();
  const [books, setBooks] = useState<Book[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | BookStatus>('all');

  // 도서 목록 로딩 함수
  const loadBooks = async () => {
    const status = activeTab === 'all' ? undefined : activeTab;
    const data = await getMyBooks(status);
    setBooks(data);
  };

  // 페이지 로드 시 도서 목록 가져오기
  useEffect(() => {
    loadBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    const success = await deleteBook(id);
    if (success) {
      // 목록 새로고침
      loadBooks();
    }
  };

  const tabs = [
    { key: 'all' as const, label: '전체' },
    { key: 'completed' as const, label: '완독' },
    { key: 'reading' as const, label: '읽는 중' },
    { key: 'want_to_read' as const, label: '읽고 싶은 책' },
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

          {/* 로딩 상태 */}
          {isLoading && (
            <p className='text-center text-gray-500'>로딩 중...</p>
          )}

          {/* 도서 목록 */}
          {!isLoading && books.length > 0 && (
            <div className='space-y-4'>
              {books.map((book) => (
                <BookCard key={book.id} book={book} onDelete={handleDelete} />
              ))}
            </div>
          )}

          {/* 도서 없음 */}
          {!isLoading && books.length === 0 && (
            <div className='text-center'>
              <p className='mb-4 text-gray-500'>등록된 도서가 없습니다.</p>
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
