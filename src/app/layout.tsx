import type { Metadata } from 'next';
import '@styles/theme.scss';
import '@styles/globals.scss';

import Layout from '@components/layouts/Layout';
import { pretendard } from './font';

export const metadata: Metadata = {
  title: 'page 0127',
  description: '나만의 온라인 서재',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko-KR" className={pretendard.className}>
      <body>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
