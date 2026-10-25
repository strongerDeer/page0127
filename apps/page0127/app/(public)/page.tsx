import { Suspense } from 'react';

import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ErrorBoundary } from '@repo/ui';

import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';
import { toPostLoginPath } from '@/shared/lib/auth/onboardingRedirect';
import {
  HERO_VARIANT_COOKIE,
  isHeroAbOn,
  resolveHeroVariant,
} from '@/shared/lib/experiment/heroVariant';
import { JsonLd } from '@/shared/lib/seo/JsonLd';
import { buildWebSiteJsonLd } from '@/shared/lib/seo/structuredData';

import { getProfile } from '@/entities/profile/api/getProfile';

import { ShelfPreviewSection } from '@/features/shelf-preview/ui/ShelfPreviewSection';

import { rankingFallbackTitle } from '@/widgets/book/model/rankingTitle';
import { BookRankingError } from '@/widgets/book/ui/BookRankingError';
import { BookRankingListSkeleton } from '@/widgets/book/ui/BookRankingListSkeleton';
import { BookRankingSection } from '@/widgets/book/ui/BookRankingSection';
import { HeroBannerSection } from '@/widgets/landing/ui/HeroBannerSection';
import { HeroBannerSkeleton } from '@/widgets/landing/ui/HeroBannerSkeleton';
import { ShelfShowcaseSection } from '@/widgets/landing/ui/ShelfShowcaseSection';
import { StartCtaButton } from '@/widgets/landing/ui/StartCtaButton';
import { TasteReportSection } from '@/widgets/landing/ui/TasteReportSection';

/**
 * 메인 랜딩 페이지 — 비로그인 방문자 전용
 *
 * 로그인한 사람은 내 서재로 보낸다 (2026-10-25 홈 역할 재검토).
 * 이 서비스의 중심은 "독서 명함"이라 로그인 사용자가 매일 볼 화면은 자기 서재다.
 * 실제로도 로그인 직후 도착지는 이미 서재였고(toPostLoginPath), 모바일 탭에는 홈이 없어
 * 로고를 눌러야만 오던 곳이었다. 와서 보는 것도 비로그인과 같은 큐레이션뿐이었다.
 *
 * 구성 원칙 (00_docs/07 참조)
 * - 폴드 안에 책이 보여야 한다. 기존 히어로는 50px 텍스트 + 버튼뿐이라
 *   첫 화면의 이미지가 0개였다. (교보 홈은 폴드에 상품 21개)
 * - 이 서비스가 무엇인지 "설명하는" 페이지가 아니라 "보여주는" 페이지다.
 *   → 3개 피처 카드(랜딩 템플릿 클리셰) 폐지, 실제 콘텐츠로 대체
 * - 집계 화면에는 기준일을 박는다.
 * - 책보다 사람이 먼저다. 맛보기(겪기) → 실제 책장(결과물) → 기능 둘러보기 → 취향 노트(보상)
 *   → 랭킹 → 시작하기. 서점식 큐레이션(발견·프로모·오늘의 기록·인생책 랭킹)은 걷어냈다.
 *   독자가 적은 지금은 한 사람의 책장이 "랭킹" 모양으로 반복될 뿐이었다(2026-10-25 재검토).
 *
 * 학습 포인트:
 * - Suspense & Streaming — 섹션마다 독립적으로 도착하고 독립적으로 실패한다
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
  const user = await getCurrentUser();

  // 로그인했으면 내 서재로. 아이디·온보딩이 아직이면 로그인 직후와 같은 곳(온보딩)으로 보낸다 —
  // 같은 판단을 두 군데서 따로 하면 언젠가 갈린다
  if (user) {
    const profile = await getProfile(user.id);
    redirect(
      toPostLoginPath({
        username: profile?.username ?? null,
        onboardedAt: profile?.onboarded_at ?? null,
        next: null,
      })
    );
  }

  const aggregatedDate = getAggregatedDate();

  // 홈 히어로 A/B — proxy.ts 가 정한 그룹. 스위치(HERO_AB)가 꺼져 있으면 언제나 A
  const heroVariant = resolveHeroVariant(
    (await cookies()).get(HERO_VARIANT_COOKIE)?.value,
    isHeroAbOn(process.env.HERO_AB)
  );

  return (
    <div className='min-h-screen bg-background'>
      <JsonLd data={webSiteJsonLd} />
      <div className='container mx-auto max-w-6xl space-y-12 px-4 py-6 md:py-8'>
        {/* 책장 맛보기 = 히어로 — 처음 온 사람에게 가입할 이유를 "겪게" 한다
            (설계: 2026-10-08-home-shelf-preview-design.md)
            맛보기의 "책장을 보면, 그 사람이 보인다." 가 이 페이지의 h1 이다.
            자리 표시는 실제 높이에 가깝게 — 짧으면 도착하는 순간 아래가 밀린다(CLS) */}
        <Suspense
          fallback={
            <div className='tint-cool min-h-176 animate-pulse rounded-3xl lg:min-h-140' />
          }
        >
          <ShelfPreviewSection variant={heroVariant} />
        </Suspense>

        {/* 실제 책장 한 개 — 맛보기로 겪은 것이 실제로 어떤 명함이 되는지 보여 준다.
            ErrorBoundary(바깥) > Suspense(안): 로딩은 Suspense, 에러는 ErrorBoundary.
            실패하면 조용히 사라진다(랜딩을 막지 않는다) */}
        <ErrorBoundary fallback={null}>
          <Suspense
            fallback={
              <div className='min-h-140 animate-pulse rounded-2xl border border-line-soft bg-sunken lg:min-h-120' />
            }
          >
            <ShelfShowcaseSection />
          </Suspense>
        </ErrorBoundary>

        {/* 롤링 배너 — 공유·케미·취향 노트·목표를 넘겨 보는 "기능 둘러보기" 자리.
            첫 화면은 맛보기 하나가 맡는다. 큰 면 두 개가 첫 화면을 다투면 둘 다 약해진다.
            카피는 어드민(hero_slides)이 우선이고 코드(heroSlides.ts)는 폴백이다 */}
        <ErrorBoundary fallback={<HeroBannerSkeleton />}>
          <Suspense fallback={<HeroBannerSkeleton />}>
            <HeroBannerSection />
          </Suspense>
        </ErrorBoundary>

        {/* 취향 노트 예시 — 5권이면 받는 보상 */}
        <TasteReportSection />

        {/* 랭킹은 하나만 — 인생책 랭킹은 같은 책이 반복돼 뺐다.
            리더가 늘어 rankingTitle 이 "많이 읽힌 책"으로 돌아가면 다시 검토한다 */}
        <ErrorBoundary
          fallback={<BookRankingError title={rankingFallbackTitle('most')} />}
        >
          <Suspense fallback={<BookRankingListSkeleton />}>
            <BookRankingSection type='most' meta={`${aggregatedDate} 기준`} />
          </Suspense>
        </ErrorBoundary>

        {/* 시작하기 — 흰 카드 대신 네이비 밴드. 페이지 끝을 무겁게 닫는다.
            색은 시스템이 갖는다(band-strong) — 여기 박혀 있던 #14294e 는
            **다크 모드의 background 와 같은 색**이라 밴드가 배경에 녹았다. */}
        <section className='band-strong flex flex-col items-center gap-4 rounded-2xl px-6 py-12 text-center'>
          <h2 className='heading-2 text-white'>책장은 한 권부터 시작합니다</h2>
          <p className='text-sm text-white/70'>
            구글·카카오로 10초면 시작할 수 있어요.
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
      </div>
    </div>
  );
};

export default Home;
