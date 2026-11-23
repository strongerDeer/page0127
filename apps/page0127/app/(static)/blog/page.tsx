import Image from 'next/image';
import Link from 'next/link';

import { PageContainer } from '@repo/ui';

import { formatStoryShortDate, storyPath } from '@/entities/story';
import { getPublishedStories } from '@/entities/story/server';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '책 이야기 | page0127.',
  description:
    '읽은 책의 독후감과 인물관계도를 모았어요. 등장인물이 많은 소설도 한 장으로 정리해 두었어요.',
  alternates: { canonical: '/blog' },
};

/**
 * 책 이야기 목록 (/blog) — 정적 페이지(ISR). 어드민에서 글을 저장하면 다시 만든다.
 * 썸네일은 관계도 그림 윗부분(object-top)을 쓰고, 그림이 없는 글은 글자 카드로 그린다.
 */
export const revalidate = 86400;

export default async function StoriesPage() {
  const stories = await getPublishedStories();

  return (
    <PageContainer>
      <div className='mx-auto flex max-w-[720px] flex-col gap-8'>
        <header>
          <h1 className='heading-1'>책 이야기</h1>
          <p className='mt-2 text-text-subtle'>
            읽은 책의 독후감과 인물관계도를 모았어요.
          </p>
        </header>
        {stories.length === 0 ? (
          <p className='rounded-2xl border border-line p-6 text-center text-sm text-text-subtle'>
            첫 이야기를 준비하고 있어요.
          </p>
        ) : (
          <ul className='grid gap-4 sm:grid-cols-2'>
            {stories.map((story) => (
              <li key={story.id}>
                <Link
                  href={storyPath(story.slug)}
                  className='group flex h-full flex-col overflow-hidden rounded-2xl border border-line transition-colors hover:bg-muted'
                >
                  {story.mapImage ? (
                    <Image
                      src={story.mapImage.src}
                      width={story.mapImage.width}
                      height={story.mapImage.height}
                      alt=''
                      unoptimized
                      className='aspect-[4/3] w-full object-cover object-top'
                    />
                  ) : (
                    <div className='grid aspect-[4/3] w-full place-items-center bg-muted p-6 text-center font-semibold break-keep text-text-strong'>
                      {story.bookTitle}
                    </div>
                  )}
                  <div className='flex flex-col gap-1 p-4'>
                    <p className='font-semibold break-keep text-text-strong'>
                      {story.title}
                    </p>
                    <p className='text-sm text-text-subtle'>
                      {story.author} · {formatStoryShortDate(story.publishedAt)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
