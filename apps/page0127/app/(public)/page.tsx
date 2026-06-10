import { Suspense } from 'react';

import Link from 'next/link';

import { createClient } from '@/shared/config/supabase/server';
import { Button } from '@/shared/ui/button';

import { BookRankingListSkeleton } from '@/widgets/book/ui/BookRankingListSkeleton';
import { BookRankingSection } from '@/widgets/book/ui/BookRankingSection';

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
            <h1 className='heading-1 mb-6'>당신의 독서 DNA를 발견하세요</h1>
            <p className='heading-2 mb-8 text-muted-foreground'>
              AI 기반 독서 성향 분석 플랫폼
            </p>
            <div className='flex justify-center gap-4'>
              <Link href='/login'>
                <Button size='lg' className='px-8'>
                  무료로 시작하기
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

      {/* Rankings Section — 각 랭킹은 독립적으로 스트리밍 */}
      <div className='container mx-auto max-w-6xl space-y-8 px-4'>
        <Suspense fallback={<BookRankingListSkeleton />}>
          <BookRankingSection
            type='best'
            title='🏆 독자들이 선택한 인생책'
            subTitle='가장 많은 10점 평점을 받은 명작들입니다.'
            myReadIsbns={myReadIsbns}
            myLikedIds={myLikedIds}
            isLoggedIn={!!user}
          />
        </Suspense>

        <Suspense fallback={<BookRankingListSkeleton />}>
          <BookRankingSection
            type='most'
            title='🔥 가장 많이 완독한 책'
            subTitle='유저들이 끝까지 읽어낸 인기 도서입니다.'
            myReadIsbns={myReadIsbns}
            myLikedIds={myLikedIds}
            isLoggedIn={!!user}
          />
        </Suspense>
      </div>

      {/* Features Section */}
      <section className='section-spacing bg-muted/50'>
        <div className='container mx-auto max-w-6xl px-4'>
          <h2 className='heading-2 mb-12 text-center'>주요 기능</h2>
          <div className='grid grid-cols-1 gap-8 md:grid-cols-3'>
            <div className='rounded-lg border border-border bg-card p-6'>
              <div className='mb-4 text-4xl'>📚</div>
              <h3 className='mb-2 text-xl font-bold'>독서 기록</h3>
              <p className='text-muted-foreground'>
                읽은 책을 기록하고 통계를 확인하세요
              </p>
            </div>
            <div className='rounded-lg border border-border bg-card p-6'>
              <div className='mb-4 text-4xl'>🤖</div>
              <h3 className='mb-2 text-xl font-bold'>AI 분석</h3>
              <p className='text-muted-foreground'>
                독서 성향을 분석하고 맞춤 추천을 받으세요
              </p>
            </div>
            <div className='rounded-lg border border-border bg-card p-6'>
              <div className='mb-4 text-4xl'>🎯</div>
              <h3 className='mb-2 text-xl font-bold'>목표 관리</h3>
              <p className='text-muted-foreground'>
                연간 독서 목표를 설정하고 달성하세요
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='border-t border-border bg-card py-8'>
        <div className='container mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground'>
          <p>© 2026 page0127. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
