'use client';

import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';

import type { Book } from '@/entities/book/types';

type BookCardProps = {
  book: Book;
  onDelete?: (id: string) => void;
};

/**
 * 내 도서 카드 컴포넌트
 *
 * 학습 포인트:
 * - Next.js Link 컴포넌트 사용
 * - 조건부 렌더링 (rating, tags 등)
 */
export const BookCard = ({ book, onDelete }: BookCardProps) => {
  const statusText = {
    completed: '완독',
    reading: '읽는 중',
    want_to_read: '읽고 싶은 책',
  };

  return (
    <Card className='flex overflow-hidden'>
      {/* 책 표지 이미지 */}
      <Link
        href={`/books/${book.id}`}
        className='relative h-48 w-36 flex-shrink-0'
      >
        {book.cover_image ? (
          <Image
            src={book.cover_image}
            alt={book.title}
            fill
            className='object-cover'
            sizes='144px'
          />
        ) : (
          <div className='flex h-full w-full items-center justify-center bg-gray-200 text-gray-400'>
            No Image
          </div>
        )}
      </Link>

      {/* 책 정보 */}
      <div className='flex flex-1 flex-col'>
        <CardHeader className='pb-3'>
          <Link href={`/books/${book.id}`}>
            <h3 className='line-clamp-2 text-base font-semibold hover:text-blue-600'>
              {book.title}
            </h3>
          </Link>
          <p className='text-sm text-gray-600'>{book.author}</p>
        </CardHeader>

        <CardContent className='flex-1 pt-0'>
          <div className='space-y-2'>
            {/* 상태 배지 */}
            <div className='flex items-center gap-2'>
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                  book.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : book.status === 'reading'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {statusText[book.status]}
              </span>

              {/* 평가 점수 */}
              {book.rating !== null && book.rating !== undefined && (
                <span className='text-sm font-medium text-yellow-600'>
                  ⭐ {book.rating}
                </span>
              )}
            </div>

            {/* 완독일 */}
            {book.completed_date && (
              <p className='text-sm text-gray-500'>
                완독일: {book.completed_date}
              </p>
            )}

            {/* 한줄평 */}
            {book.one_line_review && (
              <p className='line-clamp-2 text-sm text-gray-700'>
                &quot;{book.one_line_review}&quot;
              </p>
            )}

            {/* 태그 */}
            {book.tags && book.tags.length > 0 && (
              <div className='flex flex-wrap gap-1'>
                {book.tags.map((tag, index) => (
                  <span
                    key={index}
                    className='rounded bg-gray-100 px-2 py-1 text-xs text-gray-600'
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 삭제 버튼 */}
          {onDelete && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => onDelete(book.id)}
              className='mt-4 text-red-600 hover:bg-red-50 hover:text-red-700'
            >
              삭제
            </Button>
          )}
        </CardContent>
      </div>
    </Card>
  );
};
