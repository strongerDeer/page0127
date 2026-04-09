'use client';

import Link from 'next/link';

import { Button } from '@/shared/ui/button';
import { CardContent, CardHeader } from '@/shared/ui/card';
import { ReadCountBadge } from '@/shared/ui/ReadCountBadge';

import type { Book } from '@/entities/book/types';

type BookCardInfoProps = {
  book: Book;
  onDelete?: (id: string) => void;
};

const statusText: Record<Book['status'], string> = {
  completed: '완독',
  reading: '읽는 중',
  want_to_read: '읽고 싶은 책',
};

export const BookCardInfo = ({ book, onDelete }: BookCardInfoProps) => {
  return (
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

            <ReadCountBadge readCount={book.read_count} size='sm' />

            {book.rating !== null && book.rating !== undefined && (
              <span className='text-sm font-medium text-yellow-600'>
                ⭐ {book.rating}
              </span>
            )}
          </div>

          {book.completed_date && (
            <p className='text-sm text-gray-500'>
              완독일: {book.completed_date}
            </p>
          )}

          {book.one_line_review && (
            <p className='line-clamp-2 text-sm text-gray-700'>
              &quot;{book.one_line_review}&quot;
            </p>
          )}

          {book.tags && book.tags.length > 0 && (
            <div className='flex flex-wrap gap-1'>
              {book.tags.map((tag) => (
                <span
                  key={tag}
                  className='rounded bg-gray-100 px-2 py-1 text-xs text-gray-600'
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className='mt-4 flex gap-2'>
          <Link href={`/books/${book.id}/edit`}>
            <Button
              variant='outline'
              size='sm'
              className='hover:bg-blue-50 hover:text-blue-700'
            >
              수정
            </Button>
          </Link>
          {onDelete && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => onDelete(book.id)}
              className='text-red-600 hover:bg-red-50 hover:text-red-700'
            >
              삭제
            </Button>
          )}
        </div>
      </CardContent>
    </div>
  );
};
