import Image from 'next/image';

import { Globe, Lock, Star } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { ReadCountBadge } from '@/shared/ui/ReadCountBadge';

import type { Book } from '@/entities/book';

const STATUS_TEXT: Record<Book['status'], string> = {
  completed: '완독',
  reading: '읽는 중',
  want_to_read: '읽고 싶은 책',
};

type BookDetailContentProps = {
  book: Book;
  /**
   * 소유자 본인이 보는 화면인지.
   * true일 때만 '나만의 메모'와 공개/비공개 배지를 노출한다.
   * (공개 서재 방문자에게는 사적 메모와 공개 여부를 감춘다)
   */
  isOwner?: boolean;
};

/**
 * 도서 상세 표시 본문 (Server Component)
 *
 * 내 서재 상세(/books/[id])와 공개 서재 상세(/[username]/[bookId])가 공유한다.
 * 소유자 액션(수정·삭제·목록으로)은 각 페이지가 자기 헤더에서 담당하고,
 * 여기서는 '책 정보 표시'만 책임진다.
 */
export const BookDetailContent = ({
  book,
  isOwner = false,
}: BookDetailContentProps) => {
  return (
    <>
      <Card>
        <CardContent className='p-6'>
          <div className='flex gap-6'>
            <div className='relative h-80 w-56 flex-shrink-0'>
              {book.cover_image ? (
                <Image
                  src={book.cover_image}
                  alt={book.title}
                  fill
                  className='object-cover'
                  sizes='224px'
                />
              ) : (
                <div className='flex h-full w-full items-center justify-center bg-sunken text-sm text-text-faint'>
                  표지 없음
                </div>
              )}
            </div>

            <div className='flex-1 space-y-4'>
              <div>
                <h1 className='heading-1 mb-2 text-text-strong'>{book.title}</h1>
                <p className='text-lg text-foreground'>{book.author}</p>
                <p className='text-muted-foreground'>{book.publisher}</p>
              </div>

              <div className='flex items-center gap-3'>
                <span
                  className={`inline-block rounded-full px-4 py-2 text-sm font-medium ${
                    book.status === 'completed'
                      ? 'bg-chart-3/15 text-chart-3'
                      : book.status === 'reading'
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {STATUS_TEXT[book.status]}
                </span>

                <ReadCountBadge readCount={book.read_count} />

                {book.rating !== null && book.rating !== undefined && (
                  <span className='flex items-center gap-1 text-lg font-medium text-text-strong'>
                    <Star className='h-4 w-4 fill-chart-4 text-chart-4' />
                    {book.rating}점
                  </span>
                )}

                {/* 공개/비공개 배지는 소유자에게만 의미 있다 */}
                {isOwner && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm ${
                      book.is_public ? 'text-text-body' : 'text-text-faint'
                    }`}
                  >
                    {book.is_public ? (
                      <Globe className='h-3.5 w-3.5' />
                    ) : (
                      <Lock className='h-3.5 w-3.5' />
                    )}
                    {book.is_public ? '공개' : '비공개'}
                  </span>
                )}
              </div>

              <div className='space-y-1 text-sm text-muted-foreground'>
                {book.page_count && <p>쪽수: {book.page_count}쪽</p>}
                {book.start_date && <p>시작일: {book.start_date}</p>}
                {book.completed_date && <p>완독일: {book.completed_date}</p>}
                {book.pub_date && <p>출간일: {book.pub_date}</p>}
              </div>

              {book.tags && book.tags.length > 0 && (
                <div className='flex flex-wrap gap-2'>
                  {book.tags.map((tag) => (
                    <span
                      key={tag}
                      className='rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground'
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {book.one_line_review && (
        <Card className='mt-6'>
          <CardHeader>
            <CardTitle>한줄평</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-foreground'>{book.one_line_review}</p>
          </CardContent>
        </Card>
      )}

      {/* 나만의 메모는 사적 기록 → 소유자에게만 보여준다 */}
      {isOwner && book.personal_memo && (
        <Card className='mt-6'>
          <CardHeader>
            <CardTitle>나만의 메모</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='whitespace-pre-wrap text-foreground'>
              {book.personal_memo}
            </p>
          </CardContent>
        </Card>
      )}

      {book.description && (
        <Card className='mt-6'>
          <CardHeader>
            <CardTitle>책 소개</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='whitespace-pre-wrap text-foreground'>
              {book.description}
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
};
