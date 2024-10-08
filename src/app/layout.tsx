import type { Metadata } from 'next';
import { pretendard } from '@font';
import '@styles/theme.scss';
import '@styles/globals.scss';

import Layout from '@components/layouts/Layout';

export const dynamicParams = false;

export const metadata: Metadata = {
  // metadataBase: new URL('https://'),
  title: 'page 0127.',
  description: '나만의 온라인 서재',
  openGraph: {
    type: 'website',
    title: 'page 0127.',
    description: '나만의 온라인 서재',
    locale: 'ko_KR',
    siteName: 'page 0127.',
    images: ['/images/og-image.jpg'],
    // url: 'https://',
  },
  twitter: {
    card: 'summary',
    title: 'page 0127.',
    description: '나만의 온라인 서재',
    images: ['/images/og-image.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko-KR" className={pretendard.className}>
      <body>
        <WebVitals />
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
