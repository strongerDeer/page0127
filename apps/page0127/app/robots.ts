import type { MetadataRoute } from 'next';

// robots.txt 를 코드로 생성 (Next.js 파일 규칙)
// - 빌드/요청 시 /robots.txt 로 자동 서빙됨
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const robots = (): MetadataRoute.Robots => {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // 로그인 필요 영역·API 는 검색 노출 제외
      disallow: [
        '/books',
        '/feed',
        '/notifications',
        '/settings',
        '/search',
        '/api/',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
};

export default robots;
