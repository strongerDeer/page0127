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
      allow: ['/', '/books/all', '/books/info/'],
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
