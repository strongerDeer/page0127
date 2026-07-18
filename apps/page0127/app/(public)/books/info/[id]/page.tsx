import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArrowLeft, Star } from 'lucide-react';

import { createClient } from '@/shared/config/supabase/server';
import { decodeHtmlEntities } from '@/shared/lib/htmlEntities';
import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/PageContainer';

import { AddToLibraryButton } from '@/widgets/book/ui/AddToLibraryButton';
import { MyBookMemo } from '@/widgets/book/ui/MyBookMemo';
import { ReaderProfiles } from '@/widgets/book/ui/ReaderProfiles';

import type { GlobalBook } from '@/entities/book';
import type { Metadata } from 'next';

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getGlobalBook(id: string): Promise<GlobalBook | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('global_books')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

/**
 * 책 정보 페이지는 로그인 없이 열려 있다 — 이 서비스의 SEO 자산 1순위다.
 * 검색으로 유입된 사람이 "이 책을 읽은 사람들"을 보고 서비스를 알게 된다.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const book = await getGlobalBook(id);

  if (!book) return { title: '책을 찾을 수 없습니다 | page0127' };

  const title = book.author
    ? `${book.title} - ${book.author} | page0127`
    : `${book.title} | page0127`;
  // 알라딘 소개글은 HTML 엔티티가 이스케이프돼 있다 — 메타에도 디코딩해 넣는다
  const description = book.description
    ? decodeHtmlEntities(book.description).slice(0, 150)
    : `${book.title}을(를) 읽은 사람들의 기록을 page0127에서 확인해 보세요.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'book',
      images: book.cover_image ? [{ url: book.cover_image }] : undefined,
    },
  };
}

async function getBookStats(isbn: string) {
  const supabase = await createClient();

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

  // stats(book.isbn 의존)와 현재 사용자 조회는 서로 독립 → 병렬
  const supabase = await createClient();
  const [stats, { data: { user } }] = await Promise.all([
    getBookStats(book.isbn),
    supabase.auth.getUser(),
  ]);

  // 라이브러리 포함 여부는 user + book.isbn 둘 다 필요 → user 확정 후 조회
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
    <PageContainer width='content'>
      {/* 헤더 — 뒤로가기는 버튼 박스가 아니라 조용한 텍스트 링크 */}
      <div className='mb-6 flex items-center justify-between'>
        <Link
          href='/books/all'
          className='inline-flex items-center gap-1 text-sm text-text-subtle transition-colors hover:text-text-strong'
        >
          <ArrowLeft aria-hidden='true' className='size-4' />
          전체 도서
        </Link>
        <AddToLibraryButton
          book={book}
          isInLibrary={isInLibrary}
          isLoggedIn={!!user}
        />
      </div>

      <div className='grid gap-8 md:grid-cols-[200px_1fr]'>
        {/* 책 표지 & 독자 프로필 */}
        <div className='space-y-6'>
          {/* 판형을 크롭하지 않는다 — 너비만 맞추고 높이는 원본 비율대로 */}
          {book.cover_image ? (
            <Image
              src={book.cover_image}
              alt=''
              width={400}
              height={580}
              sizes='200px'
              priority
              className='book-cover h-auto w-full'
            />
          ) : (
            <div className='book-cover flex aspect-[1/1.45] w-full flex-col justify-between border border-line bg-sunken px-3 py-4 text-left'>
              <p className='line-clamp-5 break-keep text-sm font-bold leading-snug text-text-strong'>
                {book.title}
              </p>
              {book.author && (
                <p className='line-clamp-1 text-xs text-text-faint'>
                  {book.author}
                </p>
              )}
            </div>
          )}

          {/* 완독한 독자 프로필 (왼쪽 컬럼 배치) */}
          <ReaderProfiles isbn={book.isbn} />
        </div>

        {/* 책 정보 & 통계 & 메모 */}
        <div className='space-y-6'>
          <div>
            <h1 className='heading-1 text-text-strong'>{book.title}</h1>
            <p className='mt-2 text-text-body'>{book.author}</p>
            <p className='text-sm text-text-subtle'>
              {book.publisher}
              {book.pub_date && ` · ${book.pub_date}`}
            </p>

            {/* 통계 — 큰 카드 대신 제목 아래 한 줄 (교보의 별점 줄 문법) */}
            <p className='mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm'>
              <span className='flex items-center gap-1 font-semibold text-text-strong'>
                <Star
                  aria-hidden='true'
                  className='size-4 fill-chart-4 text-chart-4'
                />
                {stats.avgRating}
                <span className='font-normal text-text-faint'>
                  ({stats.ratingCount})
                </span>
              </span>
              <span aria-hidden='true' className='text-text-faint'>
                ·
              </span>
              <span className='text-text-subtle'>
                <b className='font-semibold text-text-strong'>
                  {stats.completedCount}
                </b>
                명이 완독
              </span>
            </p>
          </div>

          {/* 나의 기록 (로그인 + 서재에 있을 때만 — 컴포넌트 내부에서 체크) */}
          <MyBookMemo isbn={book.isbn} />

          {/* 책 소개 — 카드가 아니라 구분선으로 시작하는 본문 섹션 */}
          {book.description && (
            <section className='border-t border-line pt-6'>
              <h2 className='heading-2 text-text-strong'>책 소개</h2>
              <p className='mt-3 whitespace-pre-line break-keep text-[15px] leading-[1.8] text-text-body'>
                {decodeHtmlEntities(book.description)}
              </p>
            </section>
          )}

          {/* 비로그인 방문자 — 여기서 서비스를 처음 만난다 */}
          {!user && (
            <div className='flex flex-col items-center gap-3 rounded-2xl bg-sunken px-6 py-8 text-center'>
              <p className='font-medium text-text-strong'>
                이 책도 내 책장에 꽂아둘까요?
              </p>
              <p className='text-sm text-text-subtle'>
                읽은 책을 기록하면, 몰랐던 취향이 보이기 시작합니다.
              </p>
              <Link href='/login'>
                <Button className='mt-1'>내 책장 만들기</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
