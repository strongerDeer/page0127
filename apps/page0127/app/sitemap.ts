import type { MetadataRoute } from 'next';

// sitemap.xml 을 코드로 생성 (Next.js 파일 규칙)
// - 공개된 정적 페이지만 포함 (로그인 영역·동적 사용자 서재는 제외)
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const sitemap = (): MetadataRoute.Sitemap => {
  const lastModified = new Date();

  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/login`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
};

export default sitemap;
