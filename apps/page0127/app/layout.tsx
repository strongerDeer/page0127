import { Toaster } from '@repo/ui';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

import { GoogleAnalytics } from '@/shared/lib/analytics/GoogleAnalytics';
import { WebVitalsReporter } from '@/shared/lib/rum/WebVitalsReporter';
import { QueryProvider } from '@/shared/providers/QueryProvider';

import { CurrentUserProvider } from '@/entities/user';

import { VisitReporter } from '@/widgets/visit/VisitReporter';

import type { Metadata, Viewport } from 'next';

import './globals.css';

// 본문 서체는 Pretendard (한글 서비스인데 라틴 전용 Geist를 쓰고 있었다).
// dynamic subset — 브라우저가 페이지에 실제 등장하는 글자 조각만 내려받는다.
// (가변폰트 전체는 2.1MB, dynamic subset은 실사용 100KB 안팎)
const PRETENDARD_CSS =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';

// 사이트 절대 URL — sitemap/robots/OG 이미지가 절대 경로를 만들 때 공통으로 참조
// (환경변수 미설정 시 로컬 기본값으로 폴백)
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// 네이버 서치어드바이저 소유권 확인 코드. 없으면 메타 태그를 내보내지 않는다.
// (한국 서비스인데 네이버에 등록하지 않으면 검색 유입이 구조적으로 0이다)
const naverSiteVerification = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION;

const siteTitle = 'page0127 - 책장을 보면, 그 사람이 보인다';
const siteDescription =
  '읽은 책을 한 권씩 기록해 보세요. 책장이 쌓이면 AI가 나도 몰랐던 독서 취향을 들려주고, 다음에 읽을 책까지 건네드립니다.';

/*
  메타데이터 (Metadata)
  - SEO를 위한 정보 설정
  - 검색 엔진, SNS 공유 시 표시됨

  metadataBase:
  - Open Graph/트위터 이미지의 상대 경로를 절대 URL로 변환하는 기준
  - opengraph-image.tsx가 생성한 /opengraph-image 도 이 기준으로 절대화됨
*/
/*
  뷰포트·테마 색

  themeColor 는 모바일 브라우저의 주소창·상태바 색을 바꾼다. 안드로이드 크롬에서
  화면 맨 위 띠가 브랜드 색이 되어, 스크롤하는 동안 브랜드 인상이 화면 밖까지
  이어진다. 값은 파비콘 바탕과 같은 blue/600 이다 — 다르면 아이콘과 띠가 따로 논다.

  metadata 가 아니라 viewport 로 나가는 이유: Next.js 14부터 themeColor·colorScheme·
  viewport 는 metadata 에서 분리됐다. metadata 에 두면 빌드 경고가 뜬다.
*/
export const viewport: Viewport = {
  themeColor: '#1e69cb',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  keywords: '독서, 독서 기록, 독서 앱, AI 추천, 책 추천, 독서 성향 분석',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: siteUrl,
    siteName: 'page0127',
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
  },
  // 표준 주소 — 같은 화면이 여러 주소로 열려도 검색엔진이 한 곳으로 몰아준다.
  // 옛 page0127.vercel.app 은 308 로 넘어오지만, 공유 링크에 붙는 추적 파라미터
  // (?utm_source=… 등)까지 각각 다른 페이지로 세지 않게 하려면 이게 필요하다.
  alternates: { canonical: '/' },
  // 검색엔진 소유권 확인 — 모든 페이지 <head> 에 메타 태그로 자동 삽입된다.
  //
  // 네이버는 값을 코드에 박지 않고 환경변수로 받는다. 구글 것은 이미 박혀 있지만,
  // 새로 넣는 쪽은 **값을 받는 시점과 배포 시점을 떼어놓는 게** 낫다 —
  // 네이버 서치어드바이저에서 코드를 받아 Vercel 환경변수에 넣으면 재배포만으로
  // 끝나고, 코드 리뷰를 한 번 더 돌 필요가 없다.
  // 값이 없으면 태그 자체가 안 나가므로 지금 머지해도 안전하다.
  verification: {
    google: 'S1f6m1CJ5CxxM962yAvh8gvAErhndacXCGb1R1R0-JU',
    ...(naverSiteVerification ? { other: { 'naver-site-verification': naverSiteVerification } } : {}),
  },
};

/*
  Root Layout (Server Component)
  - 모든 페이지에 공통으로 적용되는 레이아웃
  - <html>, <body> 태그 포함
  - 전역 폰트 설정
  - React Query Provider 추가

  참고:
  - 기본적으로 Server Component (별도 지시어 없음)
  - 'use client' 없으면 서버에서만 실행
*/
const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang='ko-KR'>
      <head>
        {/* 폰트 CDN — 미리 연결해 두어야 첫 글자가 늦게 뜨지 않는다 */}
        <link
          rel='preconnect'
          href='https://cdn.jsdelivr.net'
          crossOrigin='anonymous'
        />
        <link rel='stylesheet' href={PRETENDARD_CSS} />
      </head>
      <body className='antialiased'>
        {/* antialiased: 폰트 렌더링 최적화 */}
        <QueryProvider>
          {/* QueryProvider 안에 있어야 useCurrentUser(React Query)를 쓸 수 있다 */}
          <CurrentUserProvider>
            {children}
            <Toaster />
            {/* 방문 기록 — 로그인 사용자의 "오늘 왔다"를 하루 한 번 남긴다.
                재방문율은 지금부터 쌓지 않으면 소급 계산이 불가능하다.
                CurrentUserProvider 안쪽이어야 한다(로그인 상태를 읽는다). */}
            <VisitReporter />
          </CurrentUserProvider>
        </QueryProvider>
        {/* GA4 — 측정 ID(NEXT_PUBLIC_GA_ID) 설정 시에만 로드 */}
        <GoogleAnalytics />
        {/* 자체 RUM — 실사용자 CWV를 우리 DB(quality_rum_samples)에 쌓아 품질
            대시보드에서 랩 수치와 나란히 본다. CrUX는 트래픽 임계 미달로 비어 있다.
            → apps/page0127/docs/rum-field-metrics.md */}
        <WebVitalsReporter />
        {/* Vercel Speed Insights — 같은 지표를 Vercel 대시보드로도 보낸다.
            조회 API가 없어 우리 DB로 못 가져오지만, 자체 RUM 수치를 대조할
            기준선으로 남겨 둔다(둘이 크게 어긋나면 우리 계측을 의심한다). */}
        <SpeedInsights />
        {/* Vercel Web Analytics — 페이지 조회수·방문자 수집 */}
        <Analytics />
      </body>
    </html>
  );
};

export default RootLayout;
