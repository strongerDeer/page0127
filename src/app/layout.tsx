import type { Metadata } from 'next';
import localFont from 'next/font/local';

import '@styles/theme.scss';
import '@styles/globals.scss';

import Layout from '@components/layouts/Layout';

export const metadata: Metadata = {
  title: 'page 0127',
  description: '나만의 온라인 서재',
};

const pretendard = localFont({
  src: '../font/PretendardVariable.woff2',
  display: 'swap',
  weight: '100 900',
  variable: '--pretendard',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko-KR">
      <body className={pretendard.className}>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
