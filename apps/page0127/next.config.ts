import { withSentryConfig } from '@sentry/nextjs';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // React Compiler 자동 메모이제이션 (Next.js 16부터 stable)
  reactCompiler: true,
  // 모노레포 패키지의 CSS/JS 파일을 트랜스파일하도록 설정
  // @repo/design-tokens 는 어디서도 import 되지 않아 제거했다.
  // 디자인 토큰의 단일 출처는 app/globals.css 다.
  transpilePackages: ['@repo/icons'],
  experimental: {
    // barrel(index) import를 개별 모듈 import로 변환해 tree-shaking 강화
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.aladin.co.kr' },
      { protocol: 'https', hostname: 'sjngwxtykqhlsvxcyqah.supabase.co' },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'stronger',

  project: 'page0127',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
