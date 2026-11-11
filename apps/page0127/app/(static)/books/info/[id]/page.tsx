import { cache } from 'react';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BookCover, PageContainer } from '@repo/ui';
import { ArrowLeft, Star } from 'lucide-react';

import { createAnonClient } from '@/shared/config/supabase/anon';
import { decodeHtmlEntities } from '@/shared/lib/htmlEntities';

import { RATING_MAX, summarizeRatings, toCoverSource } from '@/entities/book';
import { catalogVisibilityFilter } from '@/entities/book/api/catalogVisibility';
import { BookSourceCredit } from '@/entities/book/ui/BookSourceCredit';

import { getPublicReaderTotal } from '@/widgets/book/api/getBookReaders';
import {
  BookInfoActions,
  BookInfoGuestCta,
  BookInfoMyMemo,
  BookInfoReaders,
} from '@/widgets/book/ui/BookInfoPersonal';
import { GlobalBookCommentSection } from '@/widgets/book/ui/GlobalBookCommentSection';

import type { GlobalBook } from '@/entities/book';
import type { Metadata } from 'next';

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * 이 페이지는 CDN 에 미리 만들어 둔다(ISR) — 2026-11-11 Vercel CPU 한도 초과 대응.
 *
 * 그래서 서버에서 로그인(쿠키)을 읽지 않는다. 쿠키를 읽는 순간 Next 가 "사람마다 다른 페이지"로
 * 보고 매 요청 렌더링으로 돌아간다. 공용 데이터는 쿠키 없는 createAnonClient 로 읽고,
 * 사람마다 다른 부분(담기 버튼·나의 기록·이어진 리더 얼굴·비로그인 안내)은 BookInfoPersonal 이
 * 브라우저에서 채운다.
 *
 * - revalidate 1시간: 그 뒤 첫 방문 때 뒤에서 새로 만든다(그 사이엔 지난 판을 준다)
 * - 책 기록이 바뀌면 revalidateBookInfoPages() 가 바로 버린다 → 완독 수·별점은 곧바로 반영
 * - generateStaticParams 가 빈 배열: 빌드 때 미리 만들지 않고, 처음 열릴 때 만들어 캐시한다
 */
export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

/** generateMetadata 와 page 가 같은 책을 두 번 읽지 않게 요청 안에서 묶는다 */
const getGlobalBook = cache(async (id: string): Promise<GlobalBook | null> => {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from('global_books')
    .select('*')
    .eq('id', id)
    .eq('review_status', 'approved')
    // 직접 등록 책은 공용 페이지에 없다(404) — 누가 보는지 모르는 캐시 페이지라
    // "등록한 사람에게만" 규칙을 지킬 수 없다. 등록자는 목록에서 내 서재의 그 책으로 간다
    // (/books/mine/[id], HJ M1 결정 2026-11-11)
    .or(catalogVisibilityFilter(null))
    .single();

  if (error) return null;
  return data;
});

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
    ? `${book.title} - ${book.author} | page0127.`
    : `${book.title} | page0127.`;
  // 알라딘 소개글은 HTML 엔티티가 이스케이프돼 있다 — 메타에도 디코딩해 넣는다
  // 소개글의 줄바꿈은 미리보기에서 빈 줄 덩어리가 된다 — 공백 하나로 접는다
  const description = book.description
    ? decodeHtmlEntities(book.description)
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 150)
    : `${book.title}을(를) 읽은 사람들의 기록을 page0127.에서 확인해 보세요.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/books/info/${encodeURIComponent(id)}`,
      languages: { 'ko-KR': `/books/info/${encodeURIComponent(id)}` },
    },
    openGraph: {
      title,
      description,
      type: 'book',
      // images 는 두지 않는다 — 같은 폴더의 opengraph-image.tsx 가 1.91:1 카드를 만든다.
      // 표지 원본(세로)을 넘기면 카톡에서 위아래가 잘렸다.
    },
  };
}

async function getBookStats(isbn: string) {
  const supabase = createAnonClient();

  // is_public 을 명시하는 이유: RLS 는 익명 방문자만 걸러준다.
  // (지금은 익명 클라이언트라 RLS 만으로도 같지만, 의도를 코드에 남긴다)
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

  // 통계와 리더 수는 서로 독립 → 병렬
  const [stats, readerTotal] = await Promise.all([
    getBookStats(book.isbn),
    getPublicReaderTotal(createAnonClient(), book.isbn),
  ]);

  return (
    <PageContainer>
      {/* 헤더 — 뒤로가기는 버튼 박스가 아니라 조용한 텍스트 링크.
          담기 버튼이 둘이라 좁은 폰에서는 버튼 줄이 아래로 내려간다(flex-wrap) */}
      <div className='mb-6 flex flex-wrap items-center justify-between gap-3'>
        <Link
          href='/books/all'
          className='inline-flex items-center gap-1 text-sm text-text-subtle transition-colors hover:text-text-strong'
        >
          <ArrowLeft aria-hidden='true' className='size-4' />
          전체 도서
        </Link>
        {/* 담기 상태는 사람마다 다르다 → 브라우저에서 */}
        <BookInfoActions book={book} />
      </div>

      <div className='grid gap-8 md:grid-cols-[200px_1fr]'>
        {/* 책 표지 & 독자 프로필 */}
        <div className='space-y-6'>
          {/* 표지가 컬럼 한 칸을 통째로 차지하는 자리 — size='full'.
              판형 비율은 시스템이 정하므로 여기서 aspect 를 적지 않는다.
              대체 조판 글자 크기도 size='full' 이면 BookCover 가 키운다 */}
          <BookCover
            {...toCoverSource(book)}
            title={book.title}
            author={book.author}
            size='full'
            sizes='200px'
            priority
            large
            decorative
          />

          {/* 완독한 독자 프로필 (왼쪽 컬럼 배치) — 수는 캐시, 이어진 리더 얼굴은 브라우저에서 */}
          {readerTotal !== null && (
            <BookInfoReaders isbn={book.isbn} publicTotal={readerTotal} />
          )}
        </div>

        {/* 책 정보 & 통계 & 메모 */}
        <div className='space-y-6'>
          <div>
            <h1 className='heading-1'>{book.title}</h1>
            {/* 부제는 제목보다 작게 — 제목 덩어리로 묶이되 저자 줄과 경쟁하지 않게 */}
            {book.sub_title && (
              <p className='mt-1 text-sm text-text-subtle'>{book.sub_title}</p>
            )}
            <p className='mt-2 text-text-body'>{book.author}</p>
            <p className='text-sm text-text-subtle'>
              {book.publisher}
              {book.pub_date && ` · ${book.pub_date}`}
            </p>
            {/* 출처 표기는 약관상 의무다 — 지우지 말 것 */}
            <BookSourceCredit
              source={book.source}
              providerItemId={book.provider_item_id}
              isbn={book.isbn}
              className='mt-1 text-xs text-text-subtle'
            />

            {/* 통계 — 큰 카드 대신 제목 아래 한 줄 (교보의 별점 줄 문법) */}
            <p className='mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm'>
              {/* 평가가 하나도 없으면 "0.0 / 5 (0)"이 0점짜리 책처럼 읽힌다 */}
              {stats.ratingCount > 0 ? (
                <span className='flex items-center gap-1 font-medium text-text-strong'>
                  <Star
                    aria-hidden='true'
                    className='size-4 fill-chart-4 text-chart-4'
                  />
                  {stats.avgRating.toFixed(1)}
                  <span className='font-normal text-text-subtle'>
                    / {RATING_MAX} ({stats.ratingCount})
                  </span>
                </span>
              ) : (
                <span className='flex items-center gap-1 text-text-subtle'>
                  <Star aria-hidden='true' className='size-4 text-line' />
                  아직 별점이 없어요
                </span>
              )}
              <span aria-hidden='true' className='text-text-subtle'>
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

          {/* 나의 기록 (로그인 + 서재에 있을 때만 — 브라우저에서) */}
          <BookInfoMyMemo isbn={book.isbn} />

          {/* 책 소개 — 카드가 아니라 구분선으로 시작하는 본문 섹션 */}
          {book.description && (
            <section className='border-t border-line pt-6'>
              <h2 className='heading-2'>책 소개</h2>
              <p className='mt-3 whitespace-pre-line break-keep text-base leading-[1.8] text-text-body'>
                {decodeHtmlEntities(book.description)}
              </p>
            </section>
          )}

          <GlobalBookCommentSection globalBookId={book.id} />

          {/* 비로그인 방문자 — 여기서 서비스를 처음 만난다 (브라우저에서 판단) */}
          <BookInfoGuestCta />
        </div>
      </div>
    </PageContainer>
  );
}
