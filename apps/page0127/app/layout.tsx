import { Toaster } from '@repo/ui';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

import { GoogleAnalytics } from '@/shared/lib/analytics/GoogleAnalytics';
import { ServiceWorkerRegistrar } from '@/shared/lib/pwa/ServiceWorkerRegistrar';
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

// 스크립트로 넣은 스타일시트는 렌더링을 막지 않는다(파서가 기다리지 않는다).
// CSP script-src 에 'unsafe-inline' 이 이미 있어 인라인 스크립트가 허용된다.
const loadPretendardScript = `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(PRETENDARD_CSS)};document.head.appendChild(l);})();`;

// 사이트 절대 URL — sitemap/robots/OG 이미지가 절대 경로를 만들 때 공통으로 참조
// (환경변수 미설정 시 로컬 기본값으로 폴백)
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// 네이버 서치어드바이저 소유권 확인 코드. 구글 코드처럼 공개값이라 코드에 둔다.
// (한국 서비스인데 네이버에 등록하지 않으면 검색 유입이 구조적으로 0이다)
//
// 네이버는 http·https 를 서로 다른 사이트로 등록하고 코드도 따로 준다.
// 처음엔 http://page0127.com 으로 등록돼 있었고(2026-08), https 를 새로 등록하며
// 코드가 하나 더 생겼다. 메타 태그는 여러 개 둬도 되니 둘 다 남긴다.
const naverSiteVerification = [
  'bc5b7246d5e207d26d0b8a16cf699841c49c82e2', // http://page0127.com
  '1d82b46eae27cbe45ae54398b7c9908b7f5dfcd9', // https://page0127.com
];

const siteTitle = 'page0127. - 책장을 보면, 그 사람이 보인다';
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
    siteName: 'page0127.',
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
  },
  // 표준 주소(canonical)는 여기 두지 않는다. 루트 레이아웃의 값은 자기 값을 안
  // 적은 모든 페이지에 물려져서, /updates·/privacy 같은 페이지까지 "원본은 홈"이라고
  // 말하게 된다(구글 서치 콘솔 "적절한 표준 태그가 포함된 대체 페이지"로 빠졌다).
  // 홈은 (public)/page.tsx 가, 나머지 공개 페이지는 각자 자기 주소를 적는다.
  // iOS 홈 화면 앱 — 이 값이 있어야 사파리가 "웹 앱"으로 띄운다(웹푸시는 그 안에서만 된다).
  // 홈 화면 아이콘 아래 이름도 이 title 을 쓴다. (manifest.ts 의 display: 'standalone' 과 짝)
  appleWebApp: {
    capable: true,
    title: 'page0127.',
    statusBarStyle: 'default',
  },
  // 검색엔진 소유권 확인 — 모든 페이지 <head> 에 메타 태그로 자동 삽입된다.
  //
  // 구글·네이버 소유확인 코드는 공개값이라 코드에 둔다.
  verification: {
    google: 'S1f6m1CJ5CxxM962yAvh8gvAErhndacXCGb1R1R0-JU',
    other: { 'naver-site-verification': naverSiteVerification },
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
        {/* 폰트 CSS 는 화면 그리기를 막지 않게 스크립트로 붙인다.
            <link rel='stylesheet'> 로 두면 이 CSS 를 다 받을 때까지 첫 글자가
            안 뜬다(모바일 실측 0.8~0.9초). 어차피 font-display: swap 이라 폰트가
            오기 전엔 시스템 글꼴로 보이므로, CSS 만 기다리게 할 이유가 없다. */}
        <script dangerouslySetInnerHTML={{ __html: loadPretendardScript }} />
        <noscript>
          <link rel='stylesheet' href={PRETENDARD_CSS} />
        </noscript>
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
        {/* 서비스워커 — 웹푸시 수신 + 홈 화면 앱의 오프라인 안내 (public/sw.js) */}
        <ServiceWorkerRegistrar />
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
