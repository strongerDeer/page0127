import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageContainer } from '@repo/ui';

import { OG_SIZE } from '@/shared/lib/og/theme';
import { JsonLd } from '@/shared/lib/seo/JsonLd';
import { buildStoryArticleJsonLd } from '@/shared/lib/seo/structuredData';

import {
  absoluteImageUrl,
  formatStoryDate,
  StoryMarkdown,
  storyPath,
  storyShareImagePath,
} from '@/entities/story';
import {
  getPublishedStories,
  getPublishedStory,
} from '@/entities/story/server';

import { MyRecordBlock } from '@/features/story-my-record';
import { StoryReactions } from '@/features/story-reactions';

import {
  CharacterList,
  CharacterMap,
  getStoryBook,
  MoreStories,
  StoryBookCard,
} from '@/widgets/story';

import type { Metadata } from 'next';

type PageProps = {
  params: Promise<{ slug: string }>;
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * 책 이야기 한 편 (/blog/[slug]) — "책 관련 이야기 블로그"(HJ 2026-11-24)
 *
 * 두 가지 글:
 * - 책 한 권 글: 책 카드 + 독후감 + 인물관계도 + 등장인물 (전과 같다)
 * - 독서 이야기(bookId 없음): 책 카드·별점·"독후감" 제목 없이 본문(차트 블록 포함)만
 * 본문 속 "내 기록" 블록만 브라우저에서 채운다(MyRecordBlock) — 페이지는 계속 정적이다.
 *
 * 글은 어드민(/admin/stories)에서 쓰고 stories 테이블에 저장한다(HJ 2026-11-23 C안).
 * 정적 페이지(ISR)로 캐시해 두고, 저장할 때만 다시 만든다(on-demand revalidation).
 * - generateStaticParams: 빌드 때 이미 공개된 글은 미리 만든다
 * - dynamicParams(기본 true): 배포 뒤에 새로 공개한 글도 첫 방문 때 만들어 캐시한다
 * - revalidate 하루: 위 책 카드의 표지·출판사(DB)를 가끔 새로 읽는다
 * 없는 주소는 notFound() — 공개 전 초안 주소도 404 다(RLS 가 공개 글만 준다).
 */
export const revalidate = 86400;

export async function generateStaticParams() {
  const stories = await getPublishedStories();
  return stories.map((story) => ({ slug: story.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = await getPublishedStory(slug);
  if (!story) notFound();

  const path = storyPath(story.slug);
  const title = `${story.title} | page0127.`;
  // 공유 이미지는 share-image/route.tsx 가 그린다(책 표지·첫 차트 숫자). 주소에 수정 시각을 붙여
  // 글을 저장하면 카톡·CDN 이 새 그림을 받게 한다
  const image = {
    url: storyShareImagePath(story.slug, story.updatedAt),
    width: OG_SIZE.width,
    height: OG_SIZE.height,
    alt: `${story.title} | page0127.`,
  };

  return {
    title,
    description: story.description,
    alternates: { canonical: path, languages: { 'ko-KR': path } },
    openGraph: {
      title,
      description: story.description,
      type: 'article',
      publishedTime: story.publishedAt,
      modifiedTime: story.updatedAt ?? story.publishedAt,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: story.description,
      images: [image],
    },
  };
}

export default async function StoryPage({ params }: PageProps) {
  const { slug } = await params;
  const story = await getPublishedStory(slug);
  if (!story) notFound();

  const { bookId, mapImage } = story;
  const book = bookId ? await getStoryBook(bookId) : null;
  const hasCharacters = story.characters.length > 0;
  // 목차는 칸이 둘 이상일 때만 뜻이 있다 — 본문만 있는 독서 이야기는 그리지 않는다
  const toc = [
    ['#review', bookId ? '독후감' : '본문'],
    ...(mapImage ? [['#character-map', '인물관계도']] : []),
    ...(hasCharacters ? [['#characters', '등장인물']] : []),
  ];
  const mapTitle = story.bookTitle || story.title;

  const jsonLd = buildStoryArticleJsonLd({
    title: story.title,
    description: story.description,
    url: `${siteUrl}${storyPath(story.slug)}`,
    image: mapImage ? absoluteImageUrl(mapImage.src, siteUrl) : undefined,
    datePublished: story.publishedAt,
    dateModified: story.updatedAt,
    siteName: 'page0127.',
    siteUrl,
    book: bookId
      ? {
          title: story.bookTitle,
          author: story.author,
          url: `${siteUrl}/books/info/${bookId}`,
        }
      : null,
  });

  return (
    <PageContainer>
      <JsonLd data={jsonLd} />
      <article className='mx-auto flex max-w-[720px] flex-col gap-10'>
        <header className='flex flex-col gap-3'>
          <nav aria-label='현재 위치' className='text-sm text-text-subtle'>
            <Link href='/blog' className='hover:text-text-strong'>
              책 이야기
            </Link>
            {story.bookTitle && (
              <>
                <span aria-hidden='true'> › </span>
                {story.bookTitle}
              </>
            )}
          </nav>
          <h1 className='heading-1 break-keep'>{story.title}</h1>
          <p className='text-sm text-text-subtle'>
            <time dateTime={story.publishedAt}>
              {formatStoryDate(story.publishedAt)}
            </time>
          </p>
        </header>

        {bookId && (
          <StoryBookCard
            bookId={bookId}
            bookTitle={story.bookTitle}
            author={story.author}
            rating={story.rating}
            book={book}
          />
        )}

        {toc.length > 1 && (
          <nav aria-label='목차' className='flex flex-wrap gap-2'>
            {toc.map(([href, label]) => (
              <a
                key={href}
                href={href}
                className='rounded-full border border-line px-3 py-1 text-sm text-text-subtle transition-colors hover:text-text-strong'
              >
                {label}
              </a>
            ))}
          </nav>
        )}

        <section id='review' className='scroll-mt-20'>
          {bookId && <h2 className='heading-2 mb-5'>독후감</h2>}
          <StoryMarkdown
            body={story.body}
            // 책 글은 위 "독후감" h2 아래라 h3, 책 없는 글은 본문 소제목이 곧 h2
            headingLevel={bookId ? 3 : 2}
            renderMyRecord={() => <MyRecordBlock />}
          />
        </section>

        {mapImage && (
          <section
            id='character-map'
            className='flex scroll-mt-20 flex-col gap-4'
          >
            <h2 className='heading-2'>{mapTitle} 인물관계도</h2>
            <CharacterMap full={mapImage} cards={story.mapCards} />
          </section>
        )}

        {hasCharacters && (
          <section id='characters' className='scroll-mt-20'>
            <h2 className='heading-2 mb-5'>{mapTitle} 등장인물</h2>
            <CharacterList groups={story.characters} />
          </section>
        )}

        {bookId && (
          <StoryBookCard
            variant='end'
            bookId={bookId}
            bookTitle={story.bookTitle}
            author={story.author}
            rating={story.rating}
            book={book}
          />
        )}

        {/* 좋아요·댓글 — 로그인에 따라 달라지므로 브라우저가 따로 받는다(ISR 유지) */}
        <StoryReactions storyId={story.id} />

        <MoreStories currentId={story.id} />
      </article>
    </PageContainer>
  );
}
