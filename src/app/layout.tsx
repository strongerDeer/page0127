import { SpeedInsights } from '@vercel/speed-insights/next';
import Script from 'next/script';
import type { Metadata } from 'next';
import { pretendard } from '@font';
import { SITE } from '@constants';
import Layout from '@components/layouts/Layout';

import '@styles/theme.scss';
import '@styles/globals.scss';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.baseUrl),
  title: SITE.title,
  description: SITE.description,
  icons: { icon: '/favicon.ico' },
  openGraph: {
    type: 'website',
    title: SITE.title,
    description: SITE.description,
    locale: 'ko_KR',
    siteName: SITE.title,
    images: [SITE.ogImage],
  },
  twitter: {
    card: 'summary',
    title: SITE.title,
    description: SITE.description,
    images: [SITE.ogImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko-KR" data-theme="auto" className={pretendard.className}>
      <head>
        {/* 중요 리소스 미리 로드 */}
        <link
          rel="preload"
          as="image"
          href="/images/main-visual.webp"
          type="image/webp"
          fetchPriority="high"
        />

        {/* 
        필수 원본 미리 연결하기 절감
        preconnect 또는 dns-prefetch 리소스 힌트를 추가하여 중요한 서드 파티 원본에 대한 조기 연결을 수립
        */}
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />

        <Script id="theme" strategy="beforeInteractive">
          {`
            (function() {
              function getInitialTheme() {
                const storedTheme = localStorage.getItem('theme');
                return storedTheme || 'auto'
              }
              document.documentElement.dataset.theme = getInitialTheme()
            })()
          `}
        </Script>
      </head>
      <body>
        <Layout>{children}</Layout>
        <SpeedInsights />
      </body>
    </html>
  );
}
