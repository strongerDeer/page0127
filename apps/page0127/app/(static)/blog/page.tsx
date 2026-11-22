import Image from 'next/image';
import Link from 'next/link';

import { PageContainer } from '@repo/ui';

import { STORIES, storyPath } from '@/entities/story';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '책 이야기 | page0127.',
  description:
    '읽은 책의 독후감과 인물관계도를 모았어요. 등장인물이 많은 소설도 한 장으로 정리해 두었어요.',
  alternates: { canonical: '/blog' },
};

/**
 * 책 이야기 목록 (/stories) — 정적 페이지. 목록은 코드(entities/story)에 있다.
 * 썸네일은 관계도 그림 윗부분(object-top)을 쓴다.
 */
export default function StoriesPage() {
  return (
    <PageContainer>
      <div className='mx-auto flex max-w-[720px] flex-col gap-8'>
        <header>
          <h1 className='heading-1'>책 이야기</h1>
          <p className='mt-2 text-text-subtle'>
            읽은 책의 독후감과 인물관계도를 모았어요.
          </p>
        </header>
        <ul className='grid gap-4 sm:grid-cols-2'>
          {STORIES.map((story) => (
            <li key={story.slug}>
              <Link
                href={storyPath(story.slug)}
                className='group flex h-full flex-col overflow-hidden rounded-2xl border border-line transition-colors hover:bg-muted'
              >
                <Image
                  src={story.characterMap.full.src}
                  width={story.characterMap.full.width}
                  height={story.characterMap.full.height}
                  alt=''
                  unoptimized
                  className='aspect-[4/3] w-full object-cover object-top'
                />
                <div className='flex flex-col gap-1 p-4'>
                  <p className='font-semibold break-keep text-text-strong'>
                    {story.title}
                  </p>
                  <p className='text-sm text-text-subtle'>
                    {story.author} · {story.publishedAt.replaceAll('-', '.')}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PageContainer>
  );
}
