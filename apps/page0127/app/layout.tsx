import { Geist, Geist_Mono } from 'next/font/google';

import { GoogleAnalytics } from '@/shared/lib/analytics/GoogleAnalytics';
import { QueryProvider } from '@/shared/providers/QueryProvider';
import { Toaster } from '@/shared/ui/sonner';

import { CurrentUserProvider } from '@/entities/user';

import type { Metadata } from 'next';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/*
          antialiased: 폰트 렌더링 최적화
          ${geistSans.variable}: CSS 변수로 폰트 주입
        */}
        <QueryProvider>
          {/* QueryProvider 안에 있어야 useCurrentUser(React Query)를 쓸 수 있다 */}
          <CurrentUserProvider>
            {children}
            <Toaster />
          </CurrentUserProvider>
        </QueryProvider>
        {/* GA4 — 측정 ID(NEXT_PUBLIC_GA_ID) 설정 시에만 로드 */}
        <GoogleAnalytics />
      </body>
    </html>
  );
};

export default RootLayout;
