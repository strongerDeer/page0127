import { createClient } from '@/shared/config/supabase/server';

import type { MetadataRoute } from 'next';

// sitemap.xml 을 코드로 생성 (Next.js 파일 규칙)
//
// 전체 도서(/books/all)와 책 정보(/books/info/[id])는 로그인 없이 열려 있다.
// 책 정보 페이지가 이 서비스의 SEO 자산 1순위다 — 검색으로 들어온 사람이
// "이 책을 읽은 사람들"을 보고 서비스를 처음 만난다.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// 색인에 올릴 책 수 상한 — 무한정 나열하면 sitemap 이 비대해진다
const MAX_BOOK_URLS = 1000;

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified, changeFrequency: 'daily', priority: 1 },
    {
      url: `${siteUrl}/books/all`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/about`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${siteUrl}/login`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];

  // 등록된 책들의 정보 페이지
  // DB 조회에 실패해도 sitemap 자체는 살아야 한다 (정적 경로는 항상 나간다)
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('global_books')
      .select('id, created_at')
      .order('created_at', { ascending: false })
      .limit(MAX_BOOK_URLS);

    const bookRoutes: MetadataRoute.Sitemap = (data ?? []).map((book) => ({
      url: `${siteUrl}/books/info/${book.id}`,
      lastModified: book.created_at ? new Date(book.created_at) : lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    return [...staticRoutes, ...bookRoutes];
  } catch {
    return staticRoutes;
  }
};

export default sitemap;
