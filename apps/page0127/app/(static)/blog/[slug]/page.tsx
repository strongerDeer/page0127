import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageContainer } from '@repo/ui';

import { JsonLd } from '@/shared/lib/seo/JsonLd';
import { buildStoryArticleJsonLd } from '@/shared/lib/seo/structuredData';

import {
  absoluteImageUrl,
  formatStoryDate,
  StoryMarkdown,
  storyPath,
} from '@/entities/story';
import {
  getPublishedStories,
  getPublishedStory,
} from '@/entities/story/server';

import {
  CharacterList,
  CharacterMap,
  getStoryBook,
  StoryBookCard,
} from '@/widgets/story';

import type { Metadata } from 'next';

type PageProps = {
  params: Promise<{ slug: string }>;
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * 책 이야기 한 편 — HJ 의 독후감 + 인물관계도 (/blog/[slug])
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
      // 공유 미리보기에도 관계도 그림을 쓴다 — 이 글에서 가장 눈에 띄는 것
      ...(story.mapImage && {
        images: [
          {
            url: story.mapImage.src,
            width: story.mapImage.width,
            height: story.mapImage.height,
            alt: story.mapImage.alt,
          },
        ],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: story.description,
    },
  };
}

export default async function StoryPage({ params }: PageProps) {
  const { slug } = await params;
  const story = await getPublishedStory(slug);
  if (!story) notFound();

  const book = await getStoryBook(story.bookId);
  const { mapImage } = story;
  const hasCharacters = story.characters.length > 0;
  const toc = [
    ['#review', '독후감'],
    ...(mapImage ? [['#character-map', '인물관계도']] : []),
    ...(hasCharacters ? [['#characters', '등장인물']] : []),
  ];

  const jsonLd = buildStoryArticleJsonLd({
    title: story.title,
    description: story.description,
    url: `${siteUrl}${storyPath(story.slug)}`,
    image: mapImage ? absoluteImageUrl(mapImage.src, siteUrl) : undefined,
    datePublished: story.publishedAt,
    dateModified: story.updatedAt,
    siteName: 'page0127.',
    siteUrl,
    book: {
      title: story.bookTitle,
      author: story.author,
      url: `${siteUrl}/books/info/${story.bookId}`,
    },
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
            <span aria-hidden='true'> › </span>
            {story.bookTitle}
          </nav>
          <h1 className='heading-1 break-keep'>{story.title}</h1>
          <p className='text-sm text-text-subtle'>
            <time dateTime={story.publishedAt}>
              {formatStoryDate(story.publishedAt)}
            </time>
          </p>
        </header>

        <StoryBookCard
          bookId={story.bookId}
          bookTitle={story.bookTitle}
          author={story.author}
          rating={story.rating}
          book={book}
        />

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

        <section id='review' className='scroll-mt-20'>
          <h2 className='heading-2 mb-5'>독후감</h2>
          <StoryMarkdown body={story.body} />
        </section>

        {mapImage && (
          <section
            id='character-map'
            className='flex scroll-mt-20 flex-col gap-4'
          >
            <h2 className='heading-2'>{story.bookTitle} 인물관계도</h2>
            <CharacterMap full={mapImage} cards={story.mapCards} />
          </section>
        )}

        {hasCharacters && (
          <section id='characters' className='scroll-mt-20'>
            <h2 className='heading-2 mb-5'>{story.bookTitle} 등장인물</h2>
            <CharacterList groups={story.characters} />
          </section>
        )}

        <StoryBookCard
          variant='end'
          bookId={story.bookId}
          bookTitle={story.bookTitle}
          author={story.author}
          rating={story.rating}
          book={book}
        />
      </article>
    </PageContainer>
  );
}
