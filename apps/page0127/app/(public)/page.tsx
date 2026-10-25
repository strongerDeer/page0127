import { Suspense } from 'react';

import { cookies } from 'next/headers';
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
import { toDisplayName } from '@/entities/profile/model/displayName';

import { ShelfPreviewSection } from '@/features/shelf-preview/ui/ShelfPreviewSection';

import { AboutHero, FinalCta, Highlights, Manifesto } from '@/widgets/about';
import { getRecentBooks } from '@/widgets/about/api/getRecentBooks';
import { HeroBannerSection } from '@/widgets/landing/ui/HeroBannerSection';

/**
 * 메인 홈 — 로그인 여부와 상관없이 모두 같은 홈을 본다
 *
 * 로그인하면 내 서재로 보내던 것을 되돌렸다(2026-10-25 HJ "로그인하면 홈이 없는 건 문제").
 * 로그인 홈을 따로 만들지 않고 같은 홈에서 버튼만 바꾼다 —
 * 가입 버튼 → 내 서재로·서재 공유하기, 맛보기(가입 유도용 체험)는 숨긴다.
 * 로그인 직후 도착지는 그대로 내 서재다(toPostLoginPath). 홈은 로고·메뉴로 온다.
 *
 * 구성 (2026-10-25 HJ 홈 개편 — 소개 페이지와 합쳤다)
 * 배너(어드민 등록 시) → 첫 화면(읽은 책을 꽂아 두면…) → 방금 꽂힌 책 →
 * 왜 page0127.인가요 → 당신의 첫인상(맛보기) → 책장이 쌓이면 보이는 것들 → 가입 카드.
 * - 설명(소개)과 체험(맛보기)이 두 페이지로 나뉘어 있어, 홈은 체험만·소개는 설명만 했다.
 *   처음 온 사람은 대개 홈만 본다 → 설명과 체험을 한 흐름에 둔다.
 * - 서점식 큐레이션(랭킹·발견·프로모)과 이용 방법 단계는 뺐다. 맛보기가 기록과
 *   취향을 직접 겪게 하므로 단계 설명은 중복이었다.
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

const Home = async () => {
  const user = await getCurrentUser();
  const profile = user ? await getProfile(user.id) : null;

  // 온보딩을 안 마친 사람은 아직 서재 주소가 없다 — 홈 버튼이 갈 곳이 없으니 온보딩부터
  if (user && (!profile?.username || !profile.onboarded_at)) {
    redirect(
      toPostLoginPath({
        username: profile?.username ?? null,
        onboardedAt: profile?.onboarded_at ?? null,
        next: null,
      })
    );
  }

  const member = profile?.username
    ? { username: profile.username, displayName: toDisplayName(profile) }
    : null;

  // 표지는 소개 페이지와 같은 조회라 1시간 캐시를 함께 쓴다(widgets/about/api/aboutCache.ts)
  const books = await getRecentBooks();

  const heroVariant = resolveHeroVariant(
    (await cookies()).get(HERO_VARIANT_COOKIE)?.value,
    isHeroAbOn(process.env.HERO_AB)
  );

  return (
    // break-keep: 한국어를 단어 단위로 줄바꿈한다 — 없으면 '쌓/인'처럼 단어 중간에서 끊긴다
    <div className='min-h-screen break-keep bg-background'>
      <JsonLd data={webSiteJsonLd} />

      {/* 롤링 배너 — 어드민에 등록한 슬라이드가 있을 때만 맨 위에 선다.
          없으면 자리째 비우므로 로딩 자리도 두지 않는다(빈 상자가 깜빡였다 사라지면 CLS) */}
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <div className='mx-auto max-w-6xl px-4 pt-6'>
            <HeroBannerSection />
          </div>
        </Suspense>
      </ErrorBoundary>

      {/* 첫 화면 — 이 페이지의 h1. 버튼은 같은 페이지 아래 섹션으로 내려간다 */}
      <AboutHero
        books={books}
        member={member}
        startHref='#first-impression'
        guideHref='#highlights'
      />

      <Manifesto />

      {/* 책장 맛보기(당신의 첫인상.) — 고르기·책장 2단, 저장하려고 가입하게 한다
          (설계: 2026-10-08-home-shelf-preview-design.md).
          이미 서재가 있는 사람에겐 체험할 이유가 없어 숨긴다.
          자리 표시는 실제 높이에 가깝게 — 짧으면 도착하는 순간 아래가 밀린다(CLS) */}
      {!member && (
        <>
          <Suspense fallback={<div className='min-h-176 lg:min-h-140' />}>
            <ShelfPreviewSection variant={heroVariant} />
          </Suspense>
          {/* 맛보기와 '보이는 것들'은 둘 다 흰 바탕이라 한 섹션처럼 이어 보였다 — 구분선 한 줄로 나눈다 */}
          <div className='mx-auto max-w-6xl px-4'>
            <hr className='border-line' />
          </div>
        </>
      )}

      <Highlights books={books} />

      {/* 표지가 있는 책 중에서 고른다 — 그냥 마지막 4권이면 표지 없는 칸만 설 수 있다 */}
      <FinalCta
        member={member}
        covers={books
          .map((b) => b.coverImage)
          .filter(Boolean)
          .slice(-4)}
      />
    </div>
  );
};

export default Home;
