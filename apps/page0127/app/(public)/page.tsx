import { Suspense } from 'react';

import Link from 'next/link';

import { createClient } from '@/shared/config/supabase/server';
import { Button } from '@/shared/ui/button';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

import { BookRankingError } from '@/widgets/book/ui/BookRankingError';
import { BookRankingListSkeleton } from '@/widgets/book/ui/BookRankingListSkeleton';
import { BookRankingSection } from '@/widgets/book/ui/BookRankingSection';
import { TasteExampleCard } from '@/widgets/landing/ui/TasteExampleCard';

/**
 * 메인 랜딩 페이지
 *
 * 학습 포인트:
 * - Server Component Data Fetching
 * - Suspense & Streaming — 두 랭킹을 각각 별도 Suspense로 감싸
 *   직렬 await가 아닌 병렬 스트리밍으로 도착
 * - user-specific 데이터(읽음/좋아요)는 가벼우므로 페이지에서 한 번만 fetch
 */
const Home = async () => {
  const supabase = await createClient();

  // User-specific UI 상태만 페이지에서 직접 fetch (랭킹 RPC와 무관)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const myReadIsbns: string[] = [];
  const myLikedIds: string[] = [];

  if (user) {
    const { data: myBooks } = await supabase
      .from('books')
      .select('isbn')
      .eq('user_id', user.id)
      .eq('status', 'completed');
    myBooks?.forEach((b: { isbn: string | null }) => {
      if (b.isbn) myReadIsbns.push(b.isbn);
    });

    const { data: myLikes } = await supabase
      .from('book_likes')
      .select('book_id')
      .eq('user_id', user.id);
    myLikes?.forEach((l: { book_id: string }) => myLikedIds.push(l.book_id));
  }

  return (
    <div className='min-h-screen bg-background'>
      {/* Hero Section */}
      <section className='section-spacing pb-12 pt-20'>
        <div className='container mx-auto max-w-6xl px-4'>
          <div className='text-center'>
            <h1 className='heading-1 mb-6'>책장을 보면, 그 사람이 보인다</h1>
            <p className='heading-2 mb-8 text-muted-foreground'>
              당신이 읽은 책들이 모여 당신을 말해줍니다.
              <br className='hidden md:block' /> 한 권씩 기록하다 보면, 나도
              몰랐던 취향이 보이기 시작해요.
            </p>
            <div className='flex justify-center gap-4'>
              <Link href='/login'>
                <Button size='lg' className='px-8'>
                  내 책장 만들기
                </Button>
              </Link>
              {/* 전체 도서 목록은 로그인 필요 — 비로그인 방문자에게는 숨긴다 */}
              {user && (
                <Link href='/books/all'>
                  <Button size='lg' variant='outline' className='px-8'>
                    전체 도서 둘러보기
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Taste Example Section — 가치 제안을 말 대신 결과물로 보여준다 */}
      <section className='pb-16'>
        <div className='container mx-auto max-w-6xl px-4 text-center'>
          <h2 className='heading-2 mb-3'>이런 이야기를 들려드려요</h2>
          <p className='mb-8 text-muted-foreground'>
            책장이 쌓이면, AI가 당신의 독서 취향을 찬찬히 읽어드립니다.
          </p>
          <TasteExampleCard />
        </div>
      </section>

      {/* Rankings Section — 각 랭킹은 독립적으로 스트리밍 + 독립적으로 실패 */}
      {/* ErrorBoundary(바깥) > Suspense(안): 로딩은 Suspense, 에러는 ErrorBoundary가 잡는다 */}
      {/* 한 랭킹이 실패해도 다른 랭킹·Hero·Features는 그대로 살아있다 */}
      <div className='container mx-auto max-w-6xl space-y-8 px-4'>
        <ErrorBoundary
          fallback={<BookRankingError title='🏆 독자들이 선택한 인생책' />}
        >
          <Suspense fallback={<BookRankingListSkeleton />}>
            <BookRankingSection
              type='best'
              title='🏆 독자들이 선택한 인생책'
              subTitle='10점을 준 사람이 가장 많았던 책들이에요.'
              myReadIsbns={myReadIsbns}
              myLikedIds={myLikedIds}
              isLoggedIn={!!user}
            />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary
          fallback={<BookRankingError title='🔥 가장 많이 완독한 책' />}
        >
          <Suspense fallback={<BookRankingListSkeleton />}>
            <BookRankingSection
              type='most'
              title='🔥 가장 많이 완독한 책'
              subTitle='많은 분들이 끝까지 읽어낸 책들이에요.'
              myReadIsbns={myReadIsbns}
              myLikedIds={myLikedIds}
              isLoggedIn={!!user}
            />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Features Section */}
      <section className='section-spacing bg-muted/50'>
        <div className='container mx-auto max-w-6xl px-4'>
          <h2 className='heading-2 mb-12 text-center'>
            한 권씩, 이렇게 쌓여갑니다
          </h2>
          <div className='grid grid-cols-1 gap-8 md:grid-cols-3'>
            <div className='rounded-lg border border-border bg-card p-6'>
              <div className='mb-4 text-4xl'>📚</div>
              <h3 className='mb-2 text-xl font-bold'>차곡차곡 쌓이는 책장</h3>
              <p className='text-muted-foreground'>
                흩어져 있던 독서 기록을 한곳에. 읽은 만큼 쌓이고, 쌓인 만큼 내가
                보여요.
              </p>
            </div>
            <div className='rounded-lg border border-border bg-card p-6'>
              <div className='mb-4 text-4xl'>🤖</div>
              <h3 className='mb-2 text-xl font-bold'>나도 몰랐던 내 취향</h3>
              <p className='text-muted-foreground'>
                열 권이면 충분해요. AI가 당신의 책장을 찬찬히 읽고, 다음 책까지
                건네드립니다.
              </p>
            </div>
            <div className='rounded-lg border border-border bg-card p-6'>
              <div className='mb-4 text-4xl'>🎯</div>
              <h3 className='mb-2 text-xl font-bold'>올해는 후회 없이</h3>
              <p className='text-muted-foreground'>
                연간 목표를 세우고, 달력에 완독의 흔적을 남겨보세요. 연말의
                뿌듯함은 덤이에요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='border-t border-border bg-card py-8'>
        <div className='container mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground'>
          <p className='mb-2'>당신이 읽은 책들이 모여, 당신을 말해줍니다.</p>
          <p>© 2026 page0127. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
