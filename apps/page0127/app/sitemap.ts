import { createClient } from '@/shared/config/supabase/server';

import { catalogVisibilityFilter } from '@/entities/book/api/catalogVisibility';
import {
  countReadersByIsbn,
  isBookIndexable,
} from '@/entities/book/model/bookIndexing';
import { absoluteImageUrl, storyPath } from '@/entities/story';
import { getPublishedStories } from '@/entities/story/server';

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

type PublishedStories = Awaited<ReturnType<typeof getPublishedStories>>;

const loadStories = async (): Promise<PublishedStories> => {
  try {
    return await getPublishedStories();
  } catch {
    return [];
  }
};

const getStoryRoutes = (
  stories: PublishedStories,
  lastModified: Date
): MetadataRoute.Sitemap => {
  if (stories.length === 0) return [];
  return [
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(stories[0]?.updatedAt ?? lastModified),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...stories.map((story) => ({
      url: `${siteUrl}${storyPath(story.slug)}`,
      lastModified: new Date(story.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
      ...(story.mapImage && {
        images: [absoluteImageUrl(story.mapImage.src, siteUrl)],
      }),
    })),
  ];
};

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
      // 서비스 소개 — "page0127.은 무엇인가"를 평평한 글로 담은 페이지(AI·검색 인용용)
      url: `${siteUrl}/about`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      // 오늘의 문장 뽑기 — 비회원도 뽑을 수 있는 공개 페이지(문장 본문은 HTML 에 없다)
      url: `${siteUrl}/sentence`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      // 『어린 왕자』 온라인 필사 — 비회원도 쳐 볼 수 있는 공개 페이지(장은 나눠서 공개)
      url: `${siteUrl}/typing/little-prince`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${siteUrl}/updates`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
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

  // 책 이야기(독후감·인물관계도) — 어드민에서 공개한 글. 글이 하나도 없으면 빈 목록(/blog)도 알리지 않는다.
  // images: 이미지 사이트맵 — "○○ 인물관계도" 이미지 검색에 그림을 알린다.
  // 아래 책·서재 조회와 따로 감싼다 — 한쪽이 실패해도 다른 쪽은 나가게.
  const stories = await loadStories();
  staticRoutes.push(...getStoryRoutes(stories, lastModified));

  // 등록된 책들의 정보 페이지 — 볼 게 있는 책만(model/bookIndexing.ts, HJ A안 2026-11-23).
  // 리더 2명 이상, 또는 "이 책에 남긴 말" 댓글·블로그 책 이야기가 있는 책. 나머지는 페이지에도 noindex 가 붙는다.
  // DB 조회에 실패해도 sitemap 자체는 살아야 한다 (정적 경로는 항상 나간다)
  try {
    const supabase = await createClient();
    const [{ data }, { data: publicBooks }, { data: comments }] =
      await Promise.all([
        supabase
          .from('global_books')
          .select('id, isbn, created_at')
          .eq('review_status', 'approved')
          .or(catalogVisibilityFilter())
          .order('created_at', { ascending: false })
          .limit(MAX_BOOK_URLS),
        // 리더 수(책별)와 공개 서재 주인(아래) 둘 다 이 행으로 센다
        supabase
          .from('books')
          .select('user_id, isbn, status')
          .eq('is_public', true)
          .limit(10000),
        supabase
          .from('book_comments')
          .select('global_book_id')
          .not('global_book_id', 'is', null)
          .limit(10000),
      ]);

    const readersByIsbn = countReadersByIsbn(publicBooks ?? []);
    const storyBookIds = new Set([
      // 책 없는 글(독서 이야기)은 bookId 가 null — 책 페이지 색인 판단에서 뺀다
      ...stories.flatMap((story) => (story.bookId ? [story.bookId] : [])),
      ...(comments ?? []).map((c) => c.global_book_id as string),
    ]);

    const bookRoutes: MetadataRoute.Sitemap = (data ?? [])
      .filter((book) =>
        isBookIndexable({
          readerCount: readersByIsbn.get(book.isbn) ?? 0,
          hasStory: storyBookIds.has(book.id),
        })
      )
      .map((book) => ({
        url: `${siteUrl}/books/info/${book.id}`,
        lastModified: book.created_at
          ? new Date(book.created_at)
          : lastModified,
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
    const ownerIds = [...new Set((publicBooks ?? []).map((b) => b.user_id))];

    let libraryRoutes: MetadataRoute.Sitemap = [];
    if (ownerIds.length > 0) {
      const { data: owners } = await supabase
        .from('profiles')
        .select('username, updated_at')
        .in('id', ownerIds.slice(0, MAX_LIBRARY_URLS))
        .not('username', 'is', null)
        // 주인이 "검색엔진에 내 서재 보이기"를 끈 서재는 알리지 않는다(기본 켜짐).
        // 서재 페이지에도 같은 기준으로 noindex 가 붙는다 — libraryRobots()
        .eq('search_indexable', true);

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
