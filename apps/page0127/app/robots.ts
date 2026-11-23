import type { MetadataRoute } from 'next';

// robots.txt 를 코드로 생성 (Next.js 파일 규칙)
// - 빌드/요청 시 /robots.txt 로 자동 서빙됨
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const robots = (): MetadataRoute.Robots => {
  return {
    rules: {
      userAgent: '*',
      // /books 아래에는 공개·보호 경로가 섞여 있다. 더 구체적인 Allow가
      // /books/ Disallow보다 우선해 공개 카탈로그와 상세 페이지는 색인된다.
      // /api/auth/me 는 모든 페이지가 로그인 여부를 묻는 요청이다. /api 를 막아 두면
      // 네이버 진단이 "렌더링에 필요한 리소스 접근 제한"으로 센다(2026-11-23).
      // 응답 자체는 X-Robots-Tag: noindex 라 색인되지 않는다.
      allow: ['/', '/books/all', '/books/info/', '/api/auth/me'],
      // 수집 제외. 경로 경계를 지정해 /adminreader 같은 공개 사용자명은 허용한다.
      // 로그인 페이지는 noindex를 읽을 수 있도록 수집을 허용한다.
      disallow: [
        ...[
          '/books',
          '/feed',
          '/notifications',
          '/settings',
          '/search',
          '/api',
          '/admin',
          '/dashboard',
          '/library/manage',
          '/onboarding',
          '/auth',
        ].flatMap((path) => [`${path}$`, `${path}?`, `${path}/`]),
        // 공개 서재·독서 기록 전체를 막지 않고 개인 기능만 제외한다.
        '/*/*/edit$',
        '/*/*/edit?',
        '/*/*/edit/',
        '/*/compatibility$',
        '/*/compatibility?',
        '/*/compatibility/',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
};

export default robots;
