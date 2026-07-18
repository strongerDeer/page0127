import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Globe, Lock, Star } from 'lucide-react';

import { createClient } from '@/shared/config/supabase/server';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { PageContainer } from '@/shared/ui/PageContainer';
import { ReadCountBadge } from '@/shared/ui/ReadCountBadge';

import { DeleteBookButton } from '@/features/book/ui/DeleteBookButton';

import type { Book } from '@/entities/book';

/**
 * 도서 상세 페이지 (Server Component)
 *
 * 학습 포인트:
 * - Server Component: async/await로 직접 데이터 페칭
 * - notFound() 함수: 데이터 없을 시 not-found.tsx 렌더링
 * - Dynamic Route: [id] 파라미터로 동적 라우팅
 * - Client Component 분리: 삭제 버튼만 Client Component로
 */
async function getBook(id: string): Promise<Book | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('책 조회 실패:', error);
    return null;
  }

  return data;
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BookDetailPage({ params }: PageProps) {
  const { id } = await params;
  const book = await getBook(id);

  // 책이 없으면 not-found.tsx 렌더링
  if (!book) {
    notFound();
  }

  const statusText = {
    completed: '완독',
    reading: '읽는 중',
    want_to_read: '읽고 싶은 책',
  };

  return (
    <PageContainer width='content'>
      {/* 헤더 */}
      <div className='mb-6 flex items-center justify-between'>
        <Link href='/books'>
          <Button variant='outline'>← 목록으로</Button>
        </Link>
        <div className='flex gap-2'>
          <Link href={`/books/${book.id}/edit`}>
            <Button variant='outline'>수정</Button>
          </Link>
          <DeleteBookButton bookId={book.id} />
        </div>
      </div>

      {/* 도서 정보 */}
      <Card>
        <CardContent className='p-6'>
          <div className='flex gap-6'>
            {/* 표지 이미지 */}
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
                <div className='flex h-full w-full items-center justify-center bg-sunken text-sm text-text-faint'>                  표지 없음
                </div>
              )}
            </div>

            {/* 상세 정보 */}
            <div className='flex-1 space-y-4'>
              <div>
                <h1 className='heading-1 mb-2 text-text-strong'>{book.title}</h1>
                <p className='text-lg text-foreground'>{book.author}</p>
                <p className='text-muted-foreground'>{book.publisher}</p>
              </div>

              {/* 상태 */}
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
                  {statusText[book.status]}
                </span>

                {/* 재독 횟수 뱃지 */}
                <ReadCountBadge readCount={book.read_count} />

                {book.rating !== null && book.rating !== undefined && (
                  <span className='flex items-center gap-1 text-lg font-medium text-text-strong'>
                    <Star className='h-4 w-4 fill-chart-4 text-chart-4' />
                    {book.rating}점
                  </span>
                )}

                {/* 공개/비공개 표시 */}
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
              </div>

              {/* 날짜 및 쪽수 정보 */}
              <div className='space-y-1 text-sm text-muted-foreground'>
                {book.page_count && <p>쪽수: {book.page_count}쪽</p>}
                {book.start_date && <p>시작일: {book.start_date}</p>}
                {book.completed_date && <p>완독일: {book.completed_date}</p>}
                {book.pub_date && <p>출간일: {book.pub_date}</p>}
              </div>

              {/* 태그 */}
              {book.tags && book.tags.length > 0 && (
                <div className='flex flex-wrap gap-2'>
                  {book.tags.map((tag, index) => (
                    <span
                      key={index}
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

      {/* 한줄평 */}
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

      {/* 나만의 메모 */}
      {book.personal_memo && (
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

      {/* 책 소개 */}
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
    </PageContainer>
  );
}
