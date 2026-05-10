import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BookOpen, Star, User } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

import { AddToLibraryButton } from '@/widgets/book/ui/AddToLibraryButton';
import { MyBookMemo } from '@/widgets/book/ui/MyBookMemo';
import { ReaderProfiles } from '@/widgets/book/ui/ReaderProfiles';

import { getSupabaseClient } from '@/app/api/_helpers/auth';

import type { GlobalBook } from '@/entities/book/types';

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getGlobalBook(id: string): Promise<GlobalBook | null> {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('global_books')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

async function getBookStats(isbn: string) {
  const supabase = await getSupabaseClient();

  // 완독 수
  const { count: completedCount } = await supabase
    .from('books')
    .select('*', { count: 'exact', head: true })
    .eq('isbn', isbn)
    .eq('status', 'completed');

  // 평균 평점
  const { data: ratings } = await supabase
    .from('books')
    .select('rating')
    .eq('isbn', isbn)
    .not('rating', 'is', null);

  const avgRating =
    ratings && ratings.length > 0
      ? (
          ratings.reduce((acc, curr) => acc + (curr.rating || 0), 0) /
          ratings.length
        ).toFixed(1)
      : '0.0';

  return {
    completedCount: completedCount || 0,
    avgRating,
    ratingCount: ratings?.length || 0,
  };
}

export default async function GlobalBookDetailPage({ params }: PageProps) {
  const { id } = await params;
  const book = await getGlobalBook(id);

  if (!book) notFound();

  const stats = await getBookStats(book.isbn);

  // Check if in library
  const supabase = await getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isInLibrary = false;
  if (user) {
    const { count } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('isbn', book.isbn);
    isInLibrary = !!count;
  }

  return (
    <div className='min-h-screen bg-gray-50 p-8'>
      <div className='mx-auto max-w-4xl'>
        {/* 헤더 */}
        <div className='mb-6 flex items-center justify-between'>
          <Link href='/books/all'>
            <Button variant='outline'>← 전체 도서 목록</Button>
          </Link>
          <div className='flex gap-2'>
            <AddToLibraryButton book={book} isInLibrary={isInLibrary} />
          </div>
        </div>

        <div className='grid gap-6 md:grid-cols-[240px_1fr]'>
          {/* 책 표지 & 독자 프로필 */}
          <div className='space-y-6'>
            <div className='relative aspect-[1/1.4] w-full overflow-hidden rounded-lg shadow-lg'>
              {book.cover_image ? (
                <Image
                  src={book.cover_image}
                  alt={book.title}
                  fill
                  className='object-cover'
                  sizes='(max-width: 768px) 100vw, 240px'
                />
              ) : (
                <div className='flex h-full w-full items-center justify-center bg-gray-200 text-gray-400'>
                  <BookOpen size={48} />
                </div>
              )}
            </div>

            {/* 완독한 독자 프로필 (왼쪽 컬럼 배치) */}
            <ReaderProfiles isbn={book.isbn} />
          </div>

          {/* 책 정보 & 통계 & 메모 */}
          <div className='space-y-6'>
            <div>
              <h1 className='text-3xl font-bold'>{book.title}</h1>
              <p className='mt-2 text-xl text-gray-600'>{book.author}</p>
              <p className='text-gray-500'>
                {book.publisher} · {book.pub_date}
              </p>
            </div>

            {/* 통계 카드 */}
            <div className='grid grid-cols-2 gap-4'>
              <Card>
                <CardContent className='flex flex-col items-center justify-center p-6'>
                  <div className='mb-2 rounded-full bg-blue-100 p-3 text-blue-600'>
                    <User size={24} />
                  </div>
                  <p className='text-sm text-gray-500'>완독한 리더</p>
                  <p className='text-2xl font-bold'>{stats.completedCount}명</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className='flex flex-col items-center justify-center p-6'>
                  <div className='mb-2 rounded-full bg-yellow-100 p-3 text-yellow-600'>
                    <Star size={24} />
                  </div>
                  <p className='text-sm text-gray-500'>평균 평점</p>
                  <p className='text-2xl font-bold'>
                    {stats.avgRating}{' '}
                    <span className='text-sm text-gray-400'>
                      ({stats.ratingCount})
                    </span>
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 나의 기록 (서재에 있을 때만 보임 - 컴포넌트 내부에서 체크하지만 여기서 렌더링) */}
            <MyBookMemo isbn={book.isbn} />

            {/* 책 소개 */}
            {book.description && (
              <Card>
                <CardHeader>
                  <CardTitle>책 소개</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='whitespace-pre-line text-gray-700 leading-relaxed'>
                    {book.description}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
