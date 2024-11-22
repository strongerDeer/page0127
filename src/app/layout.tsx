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
      </body>
    </html>
  );
}
