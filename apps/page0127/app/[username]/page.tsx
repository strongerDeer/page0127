import Image from 'next/image';
import { notFound } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

import type { Book } from '@/entities/book/types';

import { getProfileByUsername } from '@/entities/profile/api/getProfileByUsername';

type PageProps = {
  params: Promise<{ username: string }>;
};

/**
 * 공개된 책 목록 조회 (is_public = true)
 *
 * 학습 포인트:
 * - 다른 사람의 서재는 공개된 책만 조회
 * - is_public = true 필터링
 */
const getPublicBooks = async (userId: string): Promise<Book[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('책 목록 조회 실패:', error.message);
    return [];
  }

  return data ?? [];
};

/**
 * 공개 서재 페이지
 *
 * 학습 포인트:
 * - 동적 라우팅: /[username]
 * - username으로 사용자 조회
 * - 공개된 책만 표시 (is_public = true)
 * - 로그인 불필요 (퍼블릭 페이지)
 */
const PublicLibraryPage = async ({ params }: PageProps) => {
  const { username } = await params;

  // 1. username으로 프로필 조회
  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound(); // 404 페이지 표시
  }

  // 2. 공개된 책 목록 조회
  const books = await getPublicBooks(profile.id);

  return (
    <div className='container mx-auto max-w-6xl px-4 py-8'>
      {/* 프로필 헤더 */}
      <div className='mb-8 rounded-lg border bg-white p-6 shadow-sm'>
        <div className='flex items-start gap-4'>
          {profile.photo_url ? (
            <div className='relative h-20 w-20 overflow-hidden rounded-full'>
              <Image
                src={profile.photo_url}
                alt={profile.nickname || username}
                fill
                sizes='80px'
                className='object-cover'
                priority
              />
            </div>
          ) : (
            <div className='flex h-20 w-20 items-center justify-center rounded-full bg-gray-200 text-2xl font-bold text-gray-600'>
              {(profile.nickname || username).charAt(0).toUpperCase()}
            </div>
          )}

          <div className='flex-1'>
            <h1 className='text-2xl font-bold'>
              {profile.nickname || username}의 서재
            </h1>
            {profile.bio && (
              <p className='mt-2 text-gray-600'>{profile.bio}</p>
            )}
            <p className='mt-1 text-sm text-gray-500'>@{username}</p>
          </div>
        </div>
      </div>

      {/* 통계 요약 */}
      <div className='mb-6 grid grid-cols-3 gap-4'>
        <div className='rounded-lg border bg-white p-4 text-center'>
          <p className='text-sm text-gray-600'>공개된 책</p>
          <p className='text-2xl font-bold text-gray-900'>{books.length}권</p>
        </div>
        <div className='rounded-lg border bg-white p-4 text-center'>
          <p className='text-sm text-gray-600'>완독</p>
          <p className='text-2xl font-bold text-gray-900'>
            {books.filter((b) => b.status === 'completed').length}권
          </p>
        </div>
        <div className='rounded-lg border bg-white p-4 text-center'>
          <p className='text-sm text-gray-600'>읽는 중</p>
          <p className='text-2xl font-bold text-gray-900'>
            {books.filter((b) => b.status === 'reading').length}권
          </p>
        </div>
      </div>

      {/* 책 목록 */}
      <div>
        <h2 className='mb-4 text-xl font-bold'>공개된 책 목록</h2>

        {books.length === 0 ? (
          <div className='rounded-lg border bg-gray-50 p-12 text-center'>
            <p className='text-gray-500'>아직 공개된 책이 없습니다.</p>
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4'>
            {books.map((book) => (
              <div
                key={book.id}
                className='overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md'
              >
                {book.cover_image ? (
                  <div className='relative h-64 w-full'>
                    <Image
                      src={book.cover_image}
                      alt={book.title}
                      fill
                      sizes='(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw'
                      className='object-cover'
                    />
                  </div>
                ) : (
                  <div className='flex h-64 w-full items-center justify-center bg-gray-200 text-gray-400'>
                    No Image
                  </div>
                )}
                <div className='p-4'>
                  <h3 className='line-clamp-2 font-semibold'>{book.title}</h3>
                  <p className='mt-1 text-sm text-gray-600'>{book.author}</p>

                  {/* 상태 뱃지 */}
                  <div className='mt-2'>
                    {book.status === 'completed' && (
                      <span className='inline-block rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800'>
                        완독
                      </span>
                    )}
                    {book.status === 'reading' && (
                      <span className='inline-block rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800'>
                        읽는 중
                      </span>
                    )}
                    {book.status === 'want_to_read' && (
                      <span className='inline-block rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800'>
                        읽고 싶은 책
                      </span>
                    )}
                  </div>

                  {/* 별점 */}
                  {book.rating !== null && book.rating > 0 && (
                    <div className='mt-2 flex items-center gap-1'>
                      <span className='text-yellow-500'>⭐</span>
                      <span className='text-sm font-medium'>{book.rating}</span>
                    </div>
                  )}

                  {/* 한줄평 */}
                  {book.one_line_review && (
                    <p className='mt-2 line-clamp-2 text-sm text-gray-600'>
                      {book.one_line_review}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicLibraryPage;
