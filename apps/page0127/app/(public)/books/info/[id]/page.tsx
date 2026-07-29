import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArrowLeft, Star } from 'lucide-react';

import { createClient } from '@/shared/config/supabase/server';
import { decodeHtmlEntities } from '@/shared/lib/htmlEntities';
import { BookCover } from '@/shared/ui/BookCover';
import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/PageContainer';

import { RATING_MAX, summarizeRatings } from '@/entities/book';

import { AddToLibraryButton } from '@/widgets/book/ui/AddToLibraryButton';
import { GlobalBookCommentSection } from '@/widgets/book/ui/GlobalBookCommentSection';
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
 *
 * 그래서 없는 책은 여기서 notFound() 로 닫는다. 이 세그먼트에는 loading.tsx 가
 * 있어 본문이 도는 시점엔 이미 200 헤더가 나간 뒤이고, 그러면 없는 페이지가
 * 정상 페이지로 색인된다(soft 404). SEO 자산 1순위인 경로에서 이건 특히 나쁘다.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const book = await getGlobalBook(id);

  if (!book) notFound();

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

  // is_public 을 명시하는 이유: RLS 는 익명 방문자만 걸러준다.
  // 로그인 사용자에게는 자기 비공개 기록까지 섞여 방문자와 다른 숫자가 보였다.
  // "이 책을 몇 명이 완독했나"는 누가 보든 같아야 한다.
  const { count: completedCount, error: completedError } = await supabase
    .from('books')
    .select('*', { count: 'exact', head: true })
    .eq('isbn', isbn)
    .eq('status', 'completed')
    .eq('is_public', true);

  // status 를 여기도 거는 이유: 완독 수는 status = 'completed' 로 세므로
  // 평점 모집단이 더 넓으면 괄호 숫자가 완독 수를 넘을 수 있다
  // ("4.5 / 5 (12) · 8명이 완독"). 등록 폼이 '읽는 중'으로 되돌릴 때 rating 을
  // 지우지 않으므로 실제로 도달 가능한 경로다.
  // 완독의 부분집합이 되면 방문자에게 자연스럽게 읽힌다
  // (0점 완독 책은 평점 쪽에만 빠지므로 완전히 같아지지는 않는다).
  const { data: ratings, error: ratingsError } = await supabase
    .from('books')
    .select('rating')
    .eq('isbn', isbn)
    .eq('status', 'completed')
    .eq('is_public', true)
    .not('rating', 'is', null);

  // 에러를 버리면 스키마가 어긋났을 때 "0.0 / 5 · 0명이 완독"이 조용히 렌더된다.
  // 앱에 Supabase 생성 타입이 없어 tsc 가 못 잡으므로 런타임 error 가 유일한 신호다.
  if (completedError || ratingsError) {
    console.warn(
      `[books/info] 통계 조회 실패 (isbn=${isbn}): ` +
        `${completedError?.message ?? ''} ${ratingsError?.message ?? ''}`.trim()
    );
  }

  // 0("평가 안 함")과 10("인생책")을 그대로 평균 내면 양쪽으로 왜곡된다 — model/rating.ts
  // 평균과 권수는 같은 모집단을 써야 하므로 한 함수에서 함께 만든다.
  const { average, ratedCount } = summarizeRatings(
    (ratings ?? []).map((row) => row.rating)
  );

  return {
    completedCount: completedCount || 0,
    avgRating: average,
    ratingCount: ratedCount,
  };
}

export default async function GlobalBookDetailPage({ params }: PageProps) {
  const { id } = await params;
  const book = await getGlobalBook(id);

  if (!book) notFound();

  // stats(book.isbn 의존)와 현재 사용자 조회는 서로 독립 → 병렬
  const supabase = await createClient();
  const [
    stats,
    {
      data: { user },
    },
  ] = await Promise.all([getBookStats(book.isbn), supabase.auth.getUser()]);

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
          <BookCover
            src={book.cover_image}
            title={book.title}
            author={book.author}
            width={400}
            height={580}
            sizes='200px'
            priority
            decorative
            className='h-auto w-full'
            // 이미지는 원본 비율로 놓지만 대체 상자에는 비율이 없어 따로 준다.
            // 표지를 크게 놓는 자리라 글자도 키운다 (기본 10px → 14px)
            fallbackClassName='aspect-[1/1.45] h-auto w-full border border-line px-3 py-4 text-sm'
          />

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
              <span className='flex items-center gap-1 font-medium text-text-strong'>
                <Star
                  aria-hidden='true'
                  className='size-4 fill-chart-4 text-chart-4'
                />
                {stats.avgRating.toFixed(1)}
                <span className='font-normal text-text-faint'>
                  / {RATING_MAX} ({stats.ratingCount})
                </span>
              </span>
              <span aria-hidden='true' className='text-text-faint'>
                ·
              </span>
              <span className='text-text-subtle'>
                <b className='font-medium text-text-strong'>
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
              <p className='mt-3 whitespace-pre-line break-keep text-base leading-[1.8] text-text-body'>
                {decodeHtmlEntities(book.description)}
              </p>
            </section>
          )}

          <GlobalBookCommentSection globalBookId={book.id} />

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
