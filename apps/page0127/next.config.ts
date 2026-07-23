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
  // 모든 응답에 붙는 보안 헤더.
  // CSP(Content-Security-Policy)는 GA·Supabase·Sentry 터널·인라인 스크립트를
  // 잘못 막으면 앱이 통째로 깨질 수 있어 여기서는 제외하고, 깨질 위험이 없는
  // 4종만 먼저 적용한다. (CSP는 별도 단계에서 실제 렌더링을 확인하며 도입)
  async headers() {
    return [
      {
        // '/:path*' = 모든 경로에 동일 헤더 적용
        source: '/:path*',
        headers: [
          {
            // HTTPS 강제 + 브라우저가 2년간 기억(preload 목록 등재 대비).
            // 로컬(http)엔 영향 없고 배포(https)에서만 의미가 있다.
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            // 서버가 지정한 Content-Type을 브라우저가 멋대로 추측(sniff)하지 못하게 막음
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            // 외부 사이트로 이동할 때 경로·쿼리는 빼고 출처(origin)만 리퍼러로 전송
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            // 우리 도메인 외의 iframe 삽입 금지 → 클릭재킹 방지
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ];
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
