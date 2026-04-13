import { Geist, Geist_Mono } from 'next/font/google';

import { QueryProvider } from '@/shared/providers/QueryProvider';
import { Toaster } from '@/shared/ui/sonner';

import { CurrentUserProvider } from '@/features/auth/providers/CurrentUserProvider';

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

/*
  메타데이터 (Metadata)
  - SEO를 위한 정보 설정
  - 검색 엔진, SNS 공유 시 표시됨
*/
export const metadata: Metadata = {
  title: 'page0127 - 당신의 독서 DNA를 발견하세요',
  description:
    'AI 기반 독서 성향 분석, 비슷한 취향의 독서가 매칭, 개인 맞춤 책 추천. 모든 독서 기록을 한곳에서 관리하고 분석하세요.',
  keywords: '독서, 독서 기록, 독서 앱, AI 추천, 책 추천, 독서 성향 분석',
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
      </body>
    </html>
  );
};

export default RootLayout;
