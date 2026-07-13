import { Suspense } from 'react';

import { createClient } from '@/shared/config/supabase/server';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

import { BookRankingError } from '@/widgets/book/ui/BookRankingError';
import { BookRankingListSkeleton } from '@/widgets/book/ui/BookRankingListSkeleton';
import { BookRankingSection } from '@/widgets/book/ui/BookRankingSection';
import { HeroBannerSection } from '@/widgets/landing/ui/HeroBannerSection';
import { HeroBannerSkeleton } from '@/widgets/landing/ui/HeroBannerSkeleton';
import { SiteFooter } from '@/widgets/landing/ui/SiteFooter';
import { StartCtaButton } from '@/widgets/landing/ui/StartCtaButton';
import { TasteExampleCard } from '@/widgets/landing/ui/TasteExampleCard';

/**
 * 메인 랜딩 페이지
 *
 * 구성 원칙 (00_docs/07 참조)
 * - 폴드 안에 책이 보여야 한다. 기존 히어로는 50px 텍스트 + 버튼뿐이라
 *   첫 화면의 이미지가 0개였다. (교보 홈은 폴드에 상품 21개)
 * - 이 서비스가 무엇인지 "설명하는" 페이지가 아니라 "보여주는" 페이지다.
 *   → 3개 피처 카드(랜딩 템플릿 클리셰) 폐지, 실제 콘텐츠로 대체
 * - 집계 화면에는 기준일을 박는다.
 *
 * 학습 포인트:
 * - Suspense & Streaming — 배너·두 랭킹이 각각 독립적으로 도착
 * - user-specific 데이터(읽음/좋아요)는 가벼우므로 페이지에서 한 번만 fetch
 */

// 집계 기준일 — "어제까지의 데이터"임을 명시한다.
// 날짜를 박는다는 건 누군가 갱신 책임을 지고 있다는 선언이다.
const getAggregatedDate = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return `${yesterday.getFullYear()}.${String(yesterday.getMonth() + 1).padStart(2, '0')}.${String(yesterday.getDate()).padStart(2, '0')}`;
};

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

  const aggregatedDate = getAggregatedDate();

  return (
    <div className='min-h-screen bg-background'>
      <div className='container mx-auto max-w-6xl space-y-12 px-4 py-6 md:py-8'>
        {/* 히어로 배너 — 자동 롤링. 실제 책 표지가 들어간다 */}
        <ErrorBoundary fallback={<HeroBannerSkeleton />}>
          <Suspense fallback={<HeroBannerSkeleton />}>
            <HeroBannerSection />
          </Suspense>
        </ErrorBoundary>

        {/* 랭킹 — 각 섹션은 독립적으로 스트리밍되고 독립적으로 실패한다.
            ErrorBoundary(바깥) > Suspense(안): 로딩은 Suspense, 에러는 ErrorBoundary */}
        <ErrorBoundary fallback={<BookRankingError title='이번 주 많이 읽힌 책' />}>
          <Suspense fallback={<BookRankingListSkeleton />}>
            <BookRankingSection
              type='most'
              title='이번 주 많이 읽힌 책'
              meta={`${aggregatedDate} 기준`}
              myReadIsbns={myReadIsbns}
              myLikedIds={myLikedIds}
              isLoggedIn={!!user}
            />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary
          fallback={<BookRankingError title='10점을 준 사람이 가장 많은 책' />}
        >
          <Suspense fallback={<BookRankingListSkeleton />}>
            <BookRankingSection
              type='best'
              title='10점을 준 사람이 가장 많은 책'
              meta={`${aggregatedDate} 기준`}
              myReadIsbns={myReadIsbns}
              myLikedIds={myLikedIds}
              isLoggedIn={!!user}
            />
          </Suspense>
        </ErrorBoundary>

        {/* 취향 분석 — 무엇을 해주는지 말로 설명하는 대신 결과물을 보여준다 */}
        <section>
          <div className='mb-5 flex items-end justify-between'>
            <div>
              <h2 className='heading-2 text-text-strong'>
                page0127이 읽어주는 독서 성향
              </h2>
              <p className='mt-1 text-sm text-text-subtle'>
                완독한 책이 다섯 권 모이면 이런 이야기를 들려드려요.
              </p>
            </div>
          </div>
          <TasteExampleCard />
        </section>

        {/* 시작하기 — 배너 CTA와 중복되지 않게 한 줄로만 */}
        {!user && (
          <section className='flex flex-col items-center gap-4 rounded-xl border border-line bg-card px-6 py-10 text-center'>
            <h2 className='heading-2 text-text-strong'>
              책장은 한 권부터 시작합니다
            </h2>
            <p className='text-sm text-text-body'>
              구글 계정으로 10초면 시작할 수 있어요.
            </p>
            {/* GA4 이벤트 추적을 위해 Client 컴포넌트로 분리된 CTA */}
            <div className='mt-2'>
              <StartCtaButton location='landing_bottom' />
            </div>
          </section>
        )}
      </div>

      <SiteFooter />
    </div>
  );
};

export default Home;
