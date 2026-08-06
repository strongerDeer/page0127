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
// 공개 서재도 같은 이유로 상한을 둔다
const MAX_LIBRARY_URLS = 1000;

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
      url: `${siteUrl}/contact`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.3,
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

    // 공개 서재(/{username}) — 이 서비스의 두 번째 SEO 자산이다.
    // "책장을 보면 그 사람이 보인다"가 실제로 보이는 화면인데 지금까지 sitemap 에
    // 없었다. robots 는 막고 있지 않아 색인은 되지만, 스스로 알리지는 않았다.
    //
    // ⚠️ **공개 책이 한 권이라도 있는 서재만 넣는다.** 빈 서재를 색인에 올리면
    //    검색 결과에 내용 없는 페이지가 뜨고, 그게 쌓이면 사이트 전체 평가가
    //    깎인다. 색인은 "많이"가 아니라 "볼 게 있는 것만"이다.
    const { data: publicBooks } = await supabase
      .from('books')
      .select('user_id')
      .eq('is_public', true)
      .limit(10000);

    const ownerIds = [...new Set((publicBooks ?? []).map((b) => b.user_id))];

    let libraryRoutes: MetadataRoute.Sitemap = [];
    if (ownerIds.length > 0) {
      const { data: owners } = await supabase
        .from('profiles')
        .select('username, updated_at')
        .in('id', ownerIds.slice(0, MAX_LIBRARY_URLS))
        .not('username', 'is', null);

      libraryRoutes = (owners ?? [])
        .filter((p): p is { username: string; updated_at: string | null } =>
          Boolean(p.username)
        )
        .map((p) => ({
          url: `${siteUrl}/${p.username}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : lastModified,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }));
    }

    return [...staticRoutes, ...bookRoutes, ...libraryRoutes];
  } catch {
    return staticRoutes;
  }
};

export default sitemap;
