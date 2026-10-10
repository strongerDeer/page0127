import { Suspense } from 'react';

import Link from 'next/link';

import { ErrorBoundary } from '@repo/ui';

import { createClient } from '@/shared/config/supabase/server';
import { JsonLd } from '@/shared/lib/seo/JsonLd';
import { buildWebSiteJsonLd } from '@/shared/lib/seo/structuredData';

import { ShelfPreviewSection } from '@/features/shelf-preview/ui/ShelfPreviewSection';

import { BookRankingError } from '@/widgets/book/ui/BookRankingError';
import { BookRankingListSkeleton } from '@/widgets/book/ui/BookRankingListSkeleton';
import { BookRankingSection } from '@/widgets/book/ui/BookRankingSection';
import { DiscoveryCard } from '@/widgets/landing/ui/DiscoveryCard';
import { HeroBannerSection } from '@/widgets/landing/ui/HeroBannerSection';
import { HeroBannerSkeleton } from '@/widgets/landing/ui/HeroBannerSkeleton';
import { PromoCards } from '@/widgets/landing/ui/PromoCards';
import { StartCtaButton } from '@/widgets/landing/ui/StartCtaButton';
import { TasteReportSection } from '@/widgets/landing/ui/TasteReportSection';
import { TodayStrip } from '@/widgets/landing/ui/TodayStrip';
import { WeeklyRecapCard } from '@/widgets/recap/ui/WeeklyRecapCard';

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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// 검색엔진용 사이트 정보(JSON-LD). 사이트 전체를 대표하므로 홈에만 둔다.
const webSiteJsonLd = buildWebSiteJsonLd({
  name: 'page0127.',
  url: siteUrl,
  description:
    '읽은 책을 한 권씩 기록하면 AI가 독서 취향을 분석하고 다음에 읽을 책을 추천해 주는 독서 기록 서비스',
});

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
      <JsonLd data={webSiteJsonLd} />
      <div className='container mx-auto max-w-6xl space-y-12 px-4 py-6 md:py-8'>
        {/* 주간 회상 — 로그인 사용자에게만, 이번 주에 할 말이 있을 때만 나온다.
            실패하거나 할 말이 없으면 조용히 사라진다(랜딩을 막지 않는다) */}
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <WeeklyRecapCard />
          </Suspense>
        </ErrorBoundary>

        {/*
          페이지 대표 제목 — 화면에는 안 보이고 검색엔진과 스크린리더만 읽는다.

          시각적 제목 역할은 히어로 배너가 하지만 h1 으로 삼을 수 없다. 배너 문구는
          슬라이드마다 바뀌고 DB(hero_slides)에서 오기도 해서, 크롤러가 올 때마다
          페이지 제목이 달라진다. 그렇다고 h1 을 비워 두면 검색엔진이 "이 페이지가
          무엇인가" 를 판단할 첫 단서를 잃는다 — 실측 결과 랜딩의 h1 은 0개였다.
        */}
        {/* 비로그인이면 맛보기의 "책장을 보면, 그 사람이 보인다." 가 화면에 보이는 h1 이다.
            여기서 또 그리면 h1 이 둘이 된다 */}
        {user && (
          <h1 className='sr-only'>page0127. — 책장을 보면, 그 사람이 보인다</h1>
        )}

        {/* 책장 맛보기 = 비로그인 히어로 — 처음 온 사람에게 가입할 이유를 "겪게" 한다
            (설계: 2026-10-08-home-shelf-preview-design.md)
            로그인한 사람에게 "읽은 책을 골라 보세요"는 맞지 않으므로 비로그인에게만.
            자리 표시는 실제 높이에 가깝게 — 짧으면 도착하는 순간 아래가 밀린다(CLS) */}
        {!user && (
          <Suspense
            fallback={
              <div className='tint-cool min-h-176 animate-pulse rounded-3xl lg:min-h-140' />
            }
          >
            <ShelfPreviewSection />
          </Suspense>
        )}

        {/* 비로그인: 맛보기 바로 다음에 "5권이면 받는 것"을 보여 준다 — 방금 고른 책의 다음 보상.
            랭킹은 독자가 적은 지금 한 사람의 책장에 가까워 그 아래로 둔다 */}
        {!user && <TasteReportSection />}

        {/* 히어로 배너 — 자동 롤링. 로그인한 사람에게만.
            비로그인은 맛보기가 히어로를 맡는다. 큰 면 두 개가 첫 화면을 다투면 둘 다 약해진다 */}
        {user && (
          <ErrorBoundary fallback={<HeroBannerSkeleton />}>
            <Suspense fallback={<HeroBannerSkeleton />}>
              <HeroBannerSection />
            </Suspense>
          </ErrorBoundary>
        )}

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
        {/* minmax(0,...) 를 쓰는 이유: 그리드 아이템의 min-width 기본값은 auto 라
            안의 내용이 트랙보다 넓으면 트랙 자체가 밀려난다. 실제로 모바일에서
            페이지가 17px 가로 스크롤됐다(375 화면에 392). 0 을 하한으로 박아
            트랙이 컨테이너를 넘지 못하게 한다. */}
        <div className='grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'>
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

        {/* 인생책 랭킹 — 데이터가 쌓이면 나타난다 */}
        <ErrorBoundary
          fallback={<BookRankingError title='가장 많은 사람의 인생책' />}
        >
          <Suspense fallback={null}>
            <BookRankingSection
              type='best'
              title='가장 많은 사람의 인생책'
              meta={`${aggregatedDate} 기준`}
              myReadIsbns={myReadIsbns}
            />
          </Suspense>
        </ErrorBoundary>

        {/* 취향 노트 예시 — 로그인 사용자에겐 랭킹 아래(비로그인은 맛보기 바로 아래에 있다) */}
        {user && <TasteReportSection />}

        {/* 시작하기 — 흰 카드 대신 네이비 밴드. 페이지 끝을 무겁게 닫는다.
            색은 시스템이 갖는다(band-strong) — 여기 박혀 있던 #14294e 는
            **다크 모드의 background 와 같은 색**이라 밴드가 배경에 녹았다. */}
        {!user && (
          <section className='band-strong flex flex-col items-center gap-4 rounded-2xl px-6 py-12 text-center'>
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
            {/* 가입을 망설이는 방문자에게 '어떻게 쓰는지'를 먼저 보여 준다 —
                소개 페이지로 들어오는 길이 푸터·sitemap 뿐이었다 */}
            <Link
              href='/about#steps'
              className='text-sm font-medium text-white/80 underline-offset-4 hover:text-white hover:underline'
            >
              처음이세요? 어떻게 쓰는지 보기
            </Link>
          </section>
        )}
      </div>
    </div>
  );
};

export default Home;
