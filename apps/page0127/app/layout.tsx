import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Geist_Mono } from 'next/font/google';

import { GoogleAnalytics } from '@/shared/lib/analytics/GoogleAnalytics';
import { QueryProvider } from '@/shared/providers/QueryProvider';
import { Toaster } from '@/shared/ui/sonner';

import { CurrentUserProvider } from '@/entities/user';

import type { Metadata } from 'next';

import './globals.css';

// 본문 서체는 Pretendard (한글 서비스인데 라틴 전용 Geist를 쓰고 있었다).
// dynamic subset — 브라우저가 페이지에 실제 등장하는 글자 조각만 내려받는다.
// (가변폰트 전체는 2.1MB, dynamic subset은 실사용 100KB 안팎)
const PRETENDARD_CSS =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';

// 코드 블록 등 고정폭이 필요한 곳에만 남긴다
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// 사이트 절대 URL — sitemap/robots/OG 이미지가 절대 경로를 만들 때 공통으로 참조
// (환경변수 미설정 시 로컬 기본값으로 폴백)
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

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
  // 구글 서치 콘솔 소유권 확인 (URL 접두어 · HTML 태그 방식)
  // → 모든 페이지 <head>에 <meta name="google-site-verification" ...> 자동 삽입
  verification: {
    google: 'S1f6m1CJ5CxxM962yAvh8gvAErhndacXCGb1R1R0-JU',
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
      <body className={`${geistMono.variable} antialiased`}>
        {/* antialiased: 폰트 렌더링 최적화 */}
        <QueryProvider>
          {/* QueryProvider 안에 있어야 useCurrentUser(React Query)를 쓸 수 있다 */}
          <CurrentUserProvider>
            {children}
            <Toaster />
          </CurrentUserProvider>
        </QueryProvider>
        {/* GA4 — 측정 ID(NEXT_PUBLIC_GA_ID) 설정 시에만 로드 */}
        <GoogleAnalytics />
        {/* Vercel Speed Insights — 실사용자 페이지 성능(Core Web Vitals) 수집 */}
        <SpeedInsights />
        {/* Vercel Web Analytics — 페이지 조회수·방문자 수집 */}
        <Analytics />
      </body>
    </html>
  );
};

export default RootLayout;
