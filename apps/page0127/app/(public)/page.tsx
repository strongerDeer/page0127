import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { TrackOnMount } from '@/shared/lib/analytics/TrackOnMount';
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

import { getLeaderLifeBooks } from '@/features/shelf-preview/api/getLeaderLifeBooks';
import { getShelfPicks } from '@/features/shelf-preview/api/getShelfPicks';
import { LifeBookHero } from '@/features/shelf-preview/ui/LifeBookHero';
import {
  ShelfPanel,
  ShelfPickCount,
  ShelfPickGrid,
  ShelfPreviewProvider,
  ShelfSaveAction,
} from '@/features/shelf-preview/ui/ShelfPreview';

import {
  AboutHero,
  BadgeVisual,
  ChemVisual,
  LoungeVisual,
  Manifesto,
  SentenceVisual,
  ShareVisual,
} from '@/widgets/about';
import { getRecentBooks } from '@/widgets/about/api/getRecentBooks';
import {
  BackCover,
  buildChapters,
  Chapter,
  chapterAnchor,
  CoverPage,
  HomeBook,
} from '@/widgets/home-book';
import { getHeroBanner } from '@/widgets/landing/api/getHeroBanner';

import type { ShelfPreviewData } from '@/features/shelf-preview/ui/ShelfPreviewData';
import type { HeroVariant } from '@/shared/lib/experiment/heroVariant';
import type { Metadata } from 'next';

// 홈의 표준 주소 — 공유 링크의 ?from=share 같은 꼬리가 붙어도 한 페이지로 센다.
// (루트 레이아웃에 두면 모든 하위 페이지가 홈을 원본으로 가리키게 돼서 여기로 옮겼다)
// languages(hreflang): 한국어 판 하나뿐이라 자기 자신만 가리킨다. 판이 늘면 여기에 추가.
export const metadata: Metadata = {
  alternates: { canonical: '/', languages: { 'ko-KR': '/' } },
};

/**
 * 메인 홈 — 로그인 여부와 상관없이 모두 같은 홈을 본다
 *
 * 로그인하면 내 서재로 보내던 것을 되돌렸다(2026-10-25 HJ "로그인하면 홈이 없는 건 문제").
 * 로그인 홈을 따로 만들지 않고 같은 홈에서 버튼만 바꾼다 —
 * 가입 버튼 → 내 서재로·서재 공유하기, 맛보기(가입 유도용 체험)는 숨긴다.
 * 로그인 직후 도착지는 그대로 내 서재다(toPostLoginPath). 홈은 로고·메뉴로 온다.
 *
 * 구성 — 홈 전체가 한 권의 책이다(2026-11-17 HJ, 시안 v9). 한 쪽 = 한 화면, 한 쪽에 하나씩.
 * 표지(책상 위의 책, 어드민 배너는 표지 띠지 문구로) → 1 왜 page0127.인가요 → 2 책 고르기 → 3 내 책장 →
 * 4 문장 → 5 공개 서재와 공유 → 6 독서 케미 → 7 배지 → 8 라운지 → 뒤표지(맺음 문장 + 가입 버튼).
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

/** 맛보기 책 목록 — 그룹에 맞는 것만 읽는다. null 이면 맛보기를 숨긴다(로그인한 사람) */
const loadShelfPreview = async (
  variant: HeroVariant | null
): Promise<ShelfPreviewData | null> => {
  if (!variant) return null;
  if (variant === 'b') return { variant, leaders: await getLeaderLifeBooks() };
  return { variant, picks: await getShelfPicks() };
};

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

  const heroVariant = resolveHeroVariant(
    (await cookies()).get(HERO_VARIANT_COOKIE)?.value,
    isHeroAbOn(process.env.HERO_AB)
  );

  // 캐시한 조회는 모두 첫 화면(셸) 전에 읽는다 — Suspense 안에서 읽으면 캐시 배경 갱신이
  // waitUntil 에 실리지 않아 [db-timeout] 으로 끊긴다(ShelfPreviewData 주석).
  // 표지는 소개 페이지와 같은 조회라 1시간 캐시를 함께 쓴다(widgets/about/api/aboutCache.ts)
  // 배너 대상(로그인/비로그인)은 세션 기준이다 — 예전 HeroBannerSection 과 같다
  const [books, preview, banner] = await Promise.all([
    getRecentBooks(),
    loadShelfPreview(member ? null : heroVariant),
    getHeroBanner(Boolean(user)),
  ]);

  const chapters = buildChapters({ preview: preview?.variant ?? null });
  const covers = { books };

  // 맛보기 쪽 — A: 책 고르기·내 책장 두 쪽(상태는 Provider 하나가 함께 든다), B: 인생책 찾기 한 쪽.
  // 이미 서재가 있는 사람에겐 체험할 이유가 없어 숨긴다(preview 가 null → 쪽도 빠진다)
  const previewPages =
    preview?.variant === 'a' ? (
      <ShelfPreviewProvider picks={preview.picks}>
        <Chapter
          id='pick'
          chapters={chapters}
          kicker='1분 맛보기'
          heading='당신의 첫인상.'
          lead='기억나는 책 세 권을 골라보세요. 다음 장에서 당신의 책장이 서요.'
          aside={<ShelfPickCount shelfHref={`#${chapterAnchor('shelf')}`} />}
        >
          {/* 맛보기 깔때기의 분모 — 맛보기를 본 사람 수. 그룹은 GA 사용자 속성으로 붙는다 */}
          <TrackOnMount event='shelf_preview_view' />
          <ShelfPickGrid />
        </Chapter>
        <Chapter
          id='shelf'
          chapters={chapters}
          heading={
            <>
              고른 책이
              <br />
              책장에 꽂혔어요
            </>
          }
          lead='앞 장에서 고른 책이 여기 꽂혀요. 가입하면 이 책장을 그대로 저장해 드려요. 읽은 책이 많다면 바코드나 CSV로 한 번에 옮겨 와요.'
          aside={<ShelfSaveAction />}
        >
          <ShelfPanel />
        </Chapter>
      </ShelfPreviewProvider>
    ) : preview?.variant === 'b' ? (
      // A 의 첫인상 쪽과 같은 배치 — 왼쪽 장 번호·명조 제목·설명, 오른쪽 고르는 판
      <Chapter
        id='pick'
        chapters={chapters}
        kicker='1분 맛보기'
        heading='당신의 인생책은?'
        lead='몇 번을 다시 읽어도 좋은, 마음에 오래 남은 한 권. 그 책으로 내 서재를 시작해 보세요.'
      >
        <TrackOnMount event='shelf_preview_view' />
        <LifeBookHero leaders={preview.leaders} inBook />
      </Chapter>
    ) : null;

  return (
    // break-keep: 한국어를 단어 단위로 줄바꿈한다 — 없으면 '쌓/인'처럼 단어 중간에서 끊긴다
    <div className='min-h-screen break-keep bg-background'>
      <JsonLd data={webSiteJsonLd} />

      {/* 책 한 권 — 쪽 목록 하나(chapters)가 머리글·쪽번호·목차 번호를 정한다.
          스크롤하면 표지가 열려 책 속으로 들어가고, 쪽이 한 장씩 넘어가고, 끝에서 덮여 뒤표지가 된다 */}
      <HomeBook chapters={chapters}>
        {/* 표지 = 첫 화면. 표지 제목이 이 페이지의 h1. 버튼은 같은 책의 쪽으로 넘어간다 */}
        <CoverPage>
          <AboutHero
            member={member}
            startHref={`#${chapterAnchor('pick')}`}
            guideHref={`#${chapterAnchor('sentence')}`}
            belt={banner?.slides[0] ?? null}
          />
        </CoverPage>

        <Chapter id='why' chapters={chapters} paper='gray' layout='center'>
          <Manifesto />
        </Chapter>

        {previewPages}

        <Chapter
          id='sentence'
          chapters={chapters}
          paper='sunken'
          heading={
            <>
              책은 덮어도
              <br />
              문장은 남겨 둬요
            </>
          }
          lead={
            <>
              <b>간직한 문장.</b> 밑줄 그은 문장을 책마다 모아 두고, 하루 한 번
              오늘의 문장을 펼쳐요. 마음에 든 문장은 카드로 만들어 스토리에
              올려요.
            </>
          }
        >
          <SentenceVisual />
        </Chapter>

        <Chapter
          id='share'
          chapters={chapters}
          heading={
            <>
              주소 하나로
              <br />내 책장을 보여 줘요
            </>
          }
          lead={
            <>
              <b>공개 서재와 공유.</b> 주소 하나로 내 책장을 보여 주고, 인스타
              스토리에 올릴 이미지도 바로 만들어요.
            </>
          }
        >
          <ShareVisual {...covers} />
        </Chapter>

        <Chapter
          id='chem'
          chapters={chapters}
          paper='gray'
          heading={
            <>
              책장을 나란히 놓으면
              <br />
              보이는 사이
            </>
          }
          lead={
            <>
              <b>독서 케미.</b> 다른 사람의 책장과 나란히 놓고, 겹치는 책과
              취향을 확인해요. 케미 카드는 스토리 이미지로도 나눠요.
            </>
          }
        >
          <ChemVisual {...covers} />
        </Chapter>

        <Chapter
          id='badge'
          chapters={chapters}
          heading={
            <>
              기록할수록
              <br />
              작은 전집이 모여요
            </>
          }
          lead={
            <>
              <b>배지.</b> 성장·분야·이야기·히든 배지가 작은 전집처럼 모여요.
              이미 기록한 책으로도 바로 받아요.
            </>
          }
        >
          <BadgeVisual />
        </Chapter>

        <Chapter
          id='lounge'
          chapters={chapters}
          paper='sunken'
          heading={
            <>
              함께 읽으면
              <br />한 권 더 읽게 돼요
            </>
          }
          lead={
            <>
              <b>라운지.</b> 팔로우한 리더와 올해의 독서 배틀을 하고, 뜸한
              친구는 콕 찔러 깨워요. 새로 꽂은 책도 바로 봐요.
            </>
          }
        >
          <LoungeVisual {...covers} />
        </Chapter>

        {/* 책의 끝 — 마지막 장이 줄어들어 뒤집히면 뒤표지(맺음 문장)가 남고, 그 아래 가입 버튼이 떠오른다 */}
        <BackCover member={member} />
      </HomeBook>
    </div>
  );
};

export default Home;
