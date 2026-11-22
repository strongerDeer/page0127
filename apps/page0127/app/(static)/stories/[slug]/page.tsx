import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PageContainer } from '@repo/ui';

import { JsonLd } from '@/shared/lib/seo/JsonLd';
import { buildStoryArticleJsonLd } from '@/shared/lib/seo/structuredData';

import { getStoryBySlug, STORIES, storyPath } from '@/entities/story';

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
 * 책 이야기 한 편 — HJ 의 독후감 + 인물관계도 (/stories/[slug])
 *
 * 정적 생성(SSG): 이야기 목록이 코드(entities/story)에 있으니 빌드 때 전부 미리 만든다.
 * - generateStaticParams: 만들 주소 목록
 * - dynamicParams = false: 목록에 없는 주소는 서버를 깨우지 않고 바로 404
 * - revalidate 하루: 위 책 카드의 표지·출판사(DB)만 가끔 새로 읽으면 된다
 */
export const dynamicParams = false;
export const revalidate = 86400;

export function generateStaticParams() {
  return STORIES.map((story) => ({ slug: story.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = getStoryBySlug(slug);
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
      images: [
        {
          url: story.characterMap.full.src,
          width: story.characterMap.full.width,
          height: story.characterMap.full.height,
          alt: story.characterMap.full.alt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: story.description,
    },
  };
}

/** 2026-11-23 → 2026년 11월 23일 (서버·브라우저 시간대와 무관하게 글자 그대로) */
const formatDate = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
};

export default async function StoryPage({ params }: PageProps) {
  const { slug } = await params;
  const story = getStoryBySlug(slug);
  if (!story) notFound();

  const [{ default: Body }, book] = await Promise.all([
    story.loadBody(),
    getStoryBook(story.bookId),
  ]);

  const jsonLd = buildStoryArticleJsonLd({
    title: story.title,
    description: story.description,
    url: `${siteUrl}${storyPath(story.slug)}`,
    image: `${siteUrl}${story.characterMap.full.src}`,
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
            <Link href='/stories' className='hover:text-text-strong'>
              책 이야기
            </Link>
            <span aria-hidden='true'> › </span>
            {story.bookTitle}
          </nav>
          <h1 className='heading-1 break-keep'>{story.title}</h1>
          <p className='text-sm text-text-subtle'>
            <time dateTime={story.publishedAt}>
              {formatDate(story.publishedAt)}
            </time>
            <span aria-hidden='true'> · </span>
            스포일러 없이 초반 설정만
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
          {[
            ['#review', '독후감'],
            ['#character-map', '인물관계도'],
            ['#characters', '등장인물'],
          ].map(([href, label]) => (
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
          <Body />
        </section>

        <section
          id='character-map'
          className='flex scroll-mt-20 flex-col gap-4'
        >
          <h2 className='heading-2'>{story.bookTitle} 인물관계도</h2>
          <CharacterMap
            full={story.characterMap.full}
            cards={story.characterMap.cards}
          />
          <p className='text-xs text-text-subtle'>
            {story.author} 장편소설 · 가상 인물 이미지로 구성
          </p>
        </section>

        <section id='characters' className='scroll-mt-20'>
          <h2 className='heading-2 mb-5'>{story.bookTitle} 등장인물</h2>
          <CharacterList groups={story.characters} />
        </section>

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
