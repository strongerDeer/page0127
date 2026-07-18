import { Suspense } from 'react';

import { ArrowRight, BookOpen, ScanSearch, Sparkles } from 'lucide-react';

import { createClient } from '@/shared/config/supabase/server';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

import { BookRankingError } from '@/widgets/book/ui/BookRankingError';
import { BookRankingListSkeleton } from '@/widgets/book/ui/BookRankingListSkeleton';
import { BookRankingSection } from '@/widgets/book/ui/BookRankingSection';
import { DiscoveryCard } from '@/widgets/landing/ui/DiscoveryCard';
import { HeroBannerSection } from '@/widgets/landing/ui/HeroBannerSection';
import { HeroBannerSkeleton } from '@/widgets/landing/ui/HeroBannerSkeleton';
import { PromoCards } from '@/widgets/landing/ui/PromoCards';
import { SiteFooter } from '@/widgets/landing/ui/SiteFooter';
import { StartCtaButton } from '@/widgets/landing/ui/StartCtaButton';
import { TasteExampleCard } from '@/widgets/landing/ui/TasteExampleCard';
import { TodayStrip } from '@/widgets/landing/ui/TodayStrip';

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

  if (user) {
    const { data: myBooks } = await supabase
      .from('books')
      .select('isbn')
      .eq('user_id', user.id)
      .eq('status', 'completed');
    myBooks?.forEach((b: { isbn: string | null }) => {
      if (b.isbn) myReadIsbns.push(b.isbn);
    });
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

        {/* 오늘의 기록 — 매일 바뀌는 문자열을 화면에 하나는 둔다.
            실패하거나 데이터가 없으면 조용히 사라진다(랜딩을 막지 않는다) */}
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <TodayStrip />
          </Suspense>
        </ErrorBoundary>

        {/* 발견 카드(틴트 투톤) + 랭킹 리스트 — 편집 면과 데이터 면을 나란히.
            각 섹션은 독립적으로 스트리밍되고 독립적으로 실패한다.
            ErrorBoundary(바깥) > Suspense(안): 로딩은 Suspense, 에러는 ErrorBoundary */}
        <div className='grid items-start gap-8 lg:grid-cols-[2fr_3fr]'>
          <ErrorBoundary fallback={null}>
            <Suspense
              fallback={
                <div className='min-h-72 animate-pulse rounded-xl border border-line-soft bg-sunken' />
              }
            >
              <DiscoveryCard />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary
            fallback={<BookRankingError title='이번 주 많이 읽힌 책' />}
          >
            <Suspense fallback={<BookRankingListSkeleton />}>
              <BookRankingSection
                type='most'
                title='이번 주 많이 읽힌 책'
                meta={`${aggregatedDate} 기준`}
                myReadIsbns={myReadIsbns}
              />
            </Suspense>
          </ErrorBoundary>
        </div>

        {/* 프로모 카드 — 실제 기능으로 연결되는 비비드 면 2장 */}
        <PromoCards isLoggedIn={!!user} />

        {/* 10점 랭킹 — 데이터가 쌓이면 나타난다 */}
        <ErrorBoundary
          fallback={<BookRankingError title='10점을 준 사람이 가장 많은 책' />}
        >
          <Suspense fallback={null}>
            <BookRankingSection
              type='best'
              title='10점을 준 사람이 가장 많은 책'
              meta={`${aggregatedDate} 기준`}
              myReadIsbns={myReadIsbns}
            />
          </Suspense>
        </ErrorBoundary>

        {/* 실제 책 표지와 결과지를 함께 보여주는 에디토리얼 취향 분석 섹션 */}
        <section
          className='overflow-hidden rounded-2xl border border-line-soft p-7 md:p-10'
          style={{
            background:
              'linear-gradient(135deg, #f8f7f3 0%, #f1f4f7 58%, #edf2f8 100%)',
          }}
        >
          <div className='grid items-center gap-10 lg:grid-cols-[5fr_7fr] lg:gap-14'>
            <div className='max-w-md'>
              <p className='flex items-center gap-2 text-xs font-semibold text-primary'>
                <Sparkles aria-hidden='true' className='size-4' />
                PAGE0127 TASTE REPORT
              </p>
              <h2 className='mt-4 text-[28px] font-bold leading-[1.3] text-text-strong md:text-[34px]'>
                다섯 권의 책이
                <br />
                <span className='text-primary'>취향의 문장</span>이 됩니다
              </h2>
              <p className='mt-4 max-w-sm break-keep text-[15px] leading-relaxed text-text-body'>
                완독 기록에 반복해서 나타나는 주제와 문장의 결을 읽고, 한 편의
                취향 노트로 정리해 드려요.
              </p>

              <div className='mt-8 flex flex-wrap items-center gap-2 text-xs font-medium text-text-subtle'>
                <span className='flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-2'>
                  <BookOpen aria-hidden='true' className='size-3.5' />
                  완독 기록
                </span>
                <ArrowRight aria-hidden='true' className='size-3.5 text-text-faint' />
                <span className='flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-2'>
                  <ScanSearch aria-hidden='true' className='size-3.5' />
                  패턴 분석
                </span>
                <ArrowRight aria-hidden='true' className='size-3.5 text-text-faint' />
                <span className='flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-2'>
                  <Sparkles aria-hidden='true' className='size-3.5' />
                  취향 노트
                </span>
              </div>
            </div>

            <Suspense
              fallback={
                <div className='min-h-96 animate-pulse rounded-2xl border border-line-soft bg-white/70' />
              }
            >
              <TasteExampleCard />
            </Suspense>
          </div>
        </section>

        {/* 시작하기 — 흰 카드 대신 네이비 밴드. 페이지 끝을 무겁게 닫는다 */}
        {!user && (
          <section
            className='flex flex-col items-center gap-4 rounded-2xl px-6 py-12 text-center'
            style={{ backgroundColor: '#14294e' }}
          >
            <h2 className='heading-2 text-white'>
              책장은 한 권부터 시작합니다
            </h2>
            <p className='text-sm text-white/70'>
              구글 계정으로 10초면 시작할 수 있어요.
            </p>
            {/* GA4 이벤트 추적을 위해 Client 컴포넌트로 분리된 CTA */}
            <div className='mt-2'>
              <StartCtaButton location='landing_bottom' variant='inverse' />
            </div>
          </section>
        )}
      </div>

      <SiteFooter />
    </div>
  );
};

export default Home;
