import { withSentryConfig } from '@sentry/nextjs/config';

import type { NextConfig } from 'next';

// Preview가 운영 DB에 연결된 채 배포되는 사고를 빌드 단계에서 차단한다.
// Vercel Preview 환경에는 운영 URL(비교용)과 개발 Supabase URL을 각각 넣는다.
if (process.env.VERCEL_ENV === 'preview') {
  const previewUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const productionUrl = process.env.PRODUCTION_SUPABASE_URL;

  if (!previewUrl || !productionUrl) {
    throw new Error(
      'Preview 배포에는 NEXT_PUBLIC_SUPABASE_URL과 PRODUCTION_SUPABASE_URL이 모두 필요합니다.'
    );
  }

  if (new URL(previewUrl).origin === new URL(productionUrl).origin) {
    throw new Error(
      'Preview 배포가 운영 Supabase를 가리키고 있어 빌드를 중단합니다.'
    );
  }
}

// Supabase 오리진은 환경마다 다르다 — 로컬은 Docker(http://127.0.0.1:54321),
// Preview는 개발 프로젝트, 운영은 운영 프로젝트. env가 없는 빌드(타입체크 전용 등)에서도
// 설정이 깨지지 않게 운영 값으로 떨어뜨린다.
//
// ⚠️ 여기서 파생하지 않고 호스트를 하드코딩하면 "그 환경에서만" 조용히 깨진다.
//   2026-07-28: images.remotePatterns에 운영 호스트만 있어서, Preview·로컬에서
//   업로드한 프로필 이미지를 next/image가 거부해(허용되지 않은 호스트) 깨져 보였다.
//   운영에서만 우연히 동작하던 상태라 발견이 늦었다.
const FALLBACK_SUPABASE_ORIGIN = 'https://sjngwxtykqhlsvxcyqah.supabase.co';
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin;
  } catch {
    return FALLBACK_SUPABASE_ORIGIN;
  }
})();
const supabaseUrl = new URL(supabaseOrigin);

const nextConfig: NextConfig = {
  // React Compiler 자동 메모이제이션 (Next.js 16부터 stable)
  reactCompiler: true,
  // 프로덕션 빌드에서 console.* 호출을 제거한다. F12를 연 사용자에게 개발용
  // 디버그 로그(console.log/info/debug/warn)가 보이지 않게 한다.
  // 단, console.error는 남겨 실제 에러가 Sentry로 수집되도록 유지한다.
  // (dev 모드에는 영향 없음 — 개발 중엔 로그가 그대로 보인다.)
  compiler: {
    removeConsole: {
      exclude: ['error'],
    },
  },
  // 모노레포 패키지의 CSS/JS 파일을 트랜스파일하도록 설정
  // @repo/design-tokens 는 실제로는 CSS(dist/tokens.css)만 내보낸다. globals.css 의
  // @import 로 들어와 @tailwindcss/postcss 가 인라인하므로 Next 의 JS 모듈 그래프를
  // 타지 않고, 이 목록에서 빼도 그 import 자체는 계속 동작할 가능성이 높다. 다만
  // 검증 없이 빼는 건 위험해 남겨 둔다 — 나중에 이 패키지가 JS 진입점(예: 토큰 타입,
  // 헬퍼 함수)을 내보내게 되면 이때는 실제로 필요해진다.
  // @repo/quality 는 `./types`(타입 전용, 컴파일 시 사라짐)만 쓰이다가 `./rum`이 생기면서
  // **런타임 코드**를 내보내게 됐다. 소스가 트랜스파일 안 된 .ts라 이 목록에 없으면
  // 라우트 핸들러·서버 컴포넌트에서 import할 때 파싱 단계에서 깨진다.
  // @repo/ui 는 빌드 산출물이 아니라 .tsx 소스를 그대로 내보낸다. 여기 없으면
  // Next 가 node_modules 안의 TSX 를 파싱하지 못해 import 하는 순간 깨진다.
  // 소스를 그대로 두는 이유는 Tailwind 때문이다 — 클래스 문자열이 소스에 남아
  // 있어야 스캔되고, 미리 빌드하면 그 문자열이 사라진 CSS 를 따로 실어야 한다.
  transpilePackages: [
    '@repo/icons',
    '@repo/design-tokens',
    '@repo/quality',
    '@repo/ui',
  ],
  // 아이콘·공유 카드(Satori)가 렌더할 때 fs 로 읽는 브랜드 심볼 원본.
  // Vercel 서버 함수 번들에는 public/ 이 자동으로 실리지 않는다(CDN 이 서빙).
  // 동적 공유 카드([username]/opengraph-image·story-image 등)가 런타임에 읽을 수
  // 있게 함께 싣는다. 메타데이터 이미지 라우트 이름이 해시 접미사를 가질 수 있어
  // 라우트를 하나씩 적지 않고 전체에 싣는다(약 300KB).
  outputFileTracingIncludes: {
    '/**/*': ['./public/brand/*.png'],
  },
  // sharp(이미지 변환 엔진)를 서버 함수 묶음에서 뺀다.
  // next 가 sharp 를 의존성으로 갖고 있어 모든 함수에 따라 실리는데, 함수 하나 약 55MB 중
  // 40MB 가 sharp 의 libvips 다(glibc·musl 두 벌). Vercel 에서 /_next/image 변환은 함수가
  // 아니라 Vercel 이미지 최적화가 하고, 공유 카드·아이콘(next/og)은 sharp 대신 resvg(WASM)를
  // 쓴다. 앱 코드도 sharp 를 import 하지 않는다.
  // 왜(2026-10-27): Hobby 의 Functions Storage 가 23GB/10GB — 배포마다 함수 묶음이 저장된다.
  // 모노레포라 node_modules 가 저장소 루트에 있다 — 경로는 이 앱 폴더 기준이라 ../../ 로 올라간다
  // (**/node_modules/... 로 쓰면 맞지 않아 아무것도 빠지지 않는다).
  // 키를 '/**' 로 둔다 — '/**/*' 는 홈('/')에 맞지 않아 홈 함수에만 sharp 가 남았다.
  outputFileTracingExcludes: {
    '/**': ['../../node_modules/@img/**', '../../node_modules/sharp/**'],
  },
  experimental: {
    // 프로필 이미지 한도는 4MB(MAX_PROFILE_IMAGE_BYTES). multipart 메타데이터와
    // 나머지 폼 필드 여유를 더해 4.5mb로 둔다.
    //
    // ⚠️ 이 값을 4.5mb보다 크게 잡아도 소용이 없다 — 그 위의 Vercel Function이
    // 요청 body를 4.5MB에서 413으로 자르기 때문에, 초과분은 Next.js에 닿지도 않는다.
    // (6mb로 두었던 탓에 4.5~5MB 이미지는 앱 에러 메시지 없이 멈춘 것처럼 보였다.)
    serverActions: {
      bodySizeLimit: '4.5mb',
    },
    // barrel(index) import를 개별 모듈 import로 변환해 tree-shaking 강화
    // @repo/ui: 루트 레이아웃이 `import { Toaster } from '@repo/ui'` 한 줄만 써도
    // barrel 의 'use client' 컴포넌트(Select·DropdownMenu·Dialog·ScrollArea 등
    // Radix 전부)가 클라이언트 진입점으로 잡혀 모든 페이지 공통 JS 에 실렸다.
    optimizePackageImports: ['lucide-react', '@repo/ui'],
  },
  images: {
    // 표지 아트의 글자와 질감을 보존하는 품질. 일반 이미지 기본값은 75다.
    qualities: [75, 85],
    remotePatterns: [
      // 도서 표지·책등(검색 결과). 등록된 책의 이미지는 백필로 Supabase Storage 로 옮겼다.
      { protocol: 'https', hostname: 'image.yes24.com' },
      // Supabase Storage(프로필 이미지). 호스트가 환경마다 달라 env에서 파생한다.
      // 로컬은 http + 포트(54321)라 프로토콜·포트도 URL에서 그대로 가져온다.
      {
        protocol: supabaseUrl.protocol === 'http:' ? 'http' : 'https',
        hostname: supabaseUrl.hostname,
        ...(supabaseUrl.port ? { port: supabaseUrl.port } : {}),
      },
      // Google 로그인 프로필 사진 (lh3.googleusercontent.com 등 번호가 바뀐다)
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      // 카카오 로그인 프로필 사진 (img1·k·t1 등 호스트 번호가 바뀐다).
      // 카카오는 avatar_url 을 http 로 주지만, toIdentityDefaults 가 https 로
      // 올려 저장하므로 여기서는 https 만 허용한다.
      { protocol: 'https', hostname: '**.kakaocdn.net' },
    ],
  },
  // 짧은 유입 주소 — 인스타 프로필 링크 칸은 주소를 그대로 보여 줘서 utm 을 달면 길고 지저분하다.
  // 그래서 프로필엔 page0127.com/ig 만 두고, 여기서 utm 이 붙은 홈으로 넘긴다(GA 가 utm 으로 출처를 읽는다).
  // 아이디는 3자 이상(USERNAME_MIN_LENGTH)이라 2자 경로 'ig' 가 서재(/[username])와 겹칠 일이 없다.
  // permanent: false(307) — 브라우저가 기억하지 않아서 나중에 utm 값을 바꿔도 바로 반영된다.
  async redirects() {
    return [
      {
        source: '/ig',
        destination:
          '/?utm_source=instagram&utm_medium=social&utm_campaign=profile',
        permanent: false,
      },
    ];
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
    // supabaseOrigin은 파일 상단에서 한 번만 파생한다(images.remotePatterns와 공유).
    // 하드코딩하면 로컬에서 auth·realtime 연결이 CSP에 막혀 브라우저가 요청을
    // 발사조차 못 하고 "Failed to fetch"가 된다(네트워크 탭에도 안 남아 원인 찾기가 어렵다).
    // ws(로컬 http) / wss(운영 https) — realtime 소켓 출처
    const supabaseSocketOrigin = supabaseOrigin.replace(/^http/, 'ws');
    // 개발 모드의 HMR/Fast Refresh는 문자열을 eval로 실행한다(프로덕션 빌드는
    // 필요 없음). 그래서 'unsafe-eval'은 dev에서만 허용하고, 프로덕션 정책은
    // eval 없이 엄격하게 유지한다.
    const isDev = process.env.NODE_ENV !== 'production';
    const scriptSrc = [
      "'self'",
      "'unsafe-inline'", // GA init·Next 인라인 하이드레이션 스크립트
      ...(isDev ? ["'unsafe-eval'"] : []),
      // 바코드 인식(ZXing WebAssembly)이 WASM 을 컴파일하려면 필요하다.
      // 'unsafe-eval' 과 달리 문자열 eval 은 여전히 막힌다.
      "'wasm-unsafe-eval'",
      'https://www.googletagmanager.com',
      // Vercel Web Analytics·Speed Insights 로더.
      // 프로덕션(Vercel)에선 대개 동일 출처(/_vercel/…)로 프록시되지만,
      // 로컬·비-Vercel 환경에선 이 도메인에서 스크립트를 받으므로 허용한다.
      // (데이터 비콘은 /_vercel/… 동일 출처라 connect-src는 'self'로 충분)
      'https://va.vercel-scripts.com',
    ].join(' ');
    const contentSecurityPolicy = [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      // Pretendard 폰트 CSS(jsdelivr) + Next/Tailwind 인라인 스타일
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      // 앱 자체 + YES24/Supabase 이미지 + Google 로그인 프로필 사진 + GA 픽셀,
      // data/blob(블러 플레이스홀더)
      // 프로필 사진 출처: 구글(googleusercontent)·카카오(kakaocdn).
      // remotePatterns 와 짝을 이룬다 — 한쪽만 열면 next/image 가 통과시킨 뒤
      // 브라우저가 막거나, 그 반대가 되어 조용히 깨진다.
      `img-src 'self' data: blob: https://image.yes24.com ${supabaseOrigin} https://*.googleusercontent.com https://*.kakaocdn.net https://www.googletagmanager.com https://www.google-analytics.com`,
      // Pretendard woff 폰트(jsdelivr)
      "font-src 'self' https://cdn.jsdelivr.net",
      // API·Sentry 터널(self) + Supabase REST/realtime(wss) + GA 비콘
      // + jsdelivr: Pretendard 폰트 CSS의 소스맵(.map) fetch. DevTools를 열었을
      //   때만 요청되고 일반 방문자엔 영향 없지만, 콘솔 위반을 없애려고 허용한다.
      // + www.google.com: GA4 의 Google 신호(Google Signals) 핑이 여기로 간다.
      //   주 수집 경로(google-analytics.com)와 **호스트가 달라** 빠뜨리기 쉽고,
      //   빠지면 이벤트는 멀쩡한데 인구통계·관심사·교차기기만 조용히 빈다.
      //   2026-08-06 운영에서 체류가 쌓인 뒤 4건 차단되는 것을 확인하고 열었다.
      `connect-src 'self' ${supabaseOrigin} ${supabaseSocketOrigin} https://cdn.jsdelivr.net https://www.google-analytics.com https://www.googletagmanager.com https://www.google.com`,
      // 클릭재킹 방지(X-Frame-Options의 현대적 대응) + 기타 하드닝
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; ');

    return [
      {
        // 서비스워커 — 브라우저는 sw.js 가 바뀌었는지 매번 확인해야 새 버전이 퍼진다.
        // CDN·브라우저 캐시에 오래 남으면 고친 워커가 며칠씩 늦게 깔린다.
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
        ],
      },
      {
        // 배지 표지 시트 사본(scripts/build-badge-art.mjs) — public 파일 기본값은 max-age=0 이라
        // 다시 올 때마다 확인 요청이 간다. 그림을 바꾸면 파일 이름의 버전(-v3 등)이 바뀌므로 일주일 둔다
        source: '/badges/editorial/sized/:file*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
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
