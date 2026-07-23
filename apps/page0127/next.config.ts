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
    // 프로필 이미지는 앱에서 최대 5MB까지 허용한다. multipart 메타데이터
    // 여유를 포함해 Server Action 요청 본문은 6MB로 제한한다.
    serverActions: {
      bodySizeLimit: '6mb',
    },
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
  async headers() {
    // Content-Security-Policy — enforce(실제 차단) 모드.
    // Report-Only로 먼저 도입해, 프로덕션 빌드로 주요 페이지(로그인 전/후)를
    // 돌며 위반 0을 확인한 뒤 맨 아래 헤더 key를 'Content-Security-Policy'로
    // 바꿔 차단을 활성화했다. 이제 정책에 없는 출처의 스크립트/스타일/이미지/
    // 연결(fetch·ws)은 브라우저가 실제로 차단한다.
    //
    // 주의: GA 인라인 스크립트와 Next.js 인라인 하이드레이션 스크립트 때문에
    // script-src에 'unsafe-inline'이 필요하다. nonce로 더 강화하려면 proxy에서
    // 요청마다 nonce를 생성해 주입해야 한다(별도 작업).
    const SUPABASE_HOST = 'sjngwxtykqhlsvxcyqah.supabase.co';
    // 개발 모드의 HMR/Fast Refresh는 문자열을 eval로 실행한다(프로덕션 빌드는
    // 필요 없음). 그래서 'unsafe-eval'은 dev에서만 허용하고, 프로덕션 정책은
    // eval 없이 엄격하게 유지한다.
    const isDev = process.env.NODE_ENV !== 'production';
    const scriptSrc = [
      "'self'",
      "'unsafe-inline'", // GA init·Next 인라인 하이드레이션 스크립트
      ...(isDev ? ["'unsafe-eval'"] : []),
      'https://www.googletagmanager.com',
    ].join(' ');
    const contentSecurityPolicy = [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      // Pretendard 폰트 CSS(jsdelivr) + Next/Tailwind 인라인 스타일
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      // 앱 자체 + Aladin/Supabase 이미지 + GA 픽셀, data/blob(블러 플레이스홀더)
      `img-src 'self' data: blob: https://image.aladin.co.kr https://${SUPABASE_HOST} https://www.googletagmanager.com https://www.google-analytics.com`,
      // Pretendard woff 폰트(jsdelivr)
      "font-src 'self' https://cdn.jsdelivr.net",
      // API·Sentry 터널(self) + Supabase REST/realtime(wss) + GA 비콘
      `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://www.google-analytics.com https://www.googletagmanager.com`,
      // 클릭재킹 방지(X-Frame-Options의 현대적 대응) + 기타 하드닝
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; ');

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
          {
            // ✅ enforce: 정책 위반 리소스를 브라우저가 실제로 차단한다.
            //    Report-Only로 위반 0을 검증한 뒤 전환했다. 문제가 생기면 key를
            //    다시 'Content-Security-Policy-Report-Only'로 바꿔 되돌릴 수 있다.
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
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

  // Vercel 빌드처럼 토큰이 실제로 주입된 환경에서만 소스맵을 업로드한다.
  // 로컬·일반 CI에서 Sentry 후처리가 빌드를 멈추게 하지 않도록 한다.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

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
