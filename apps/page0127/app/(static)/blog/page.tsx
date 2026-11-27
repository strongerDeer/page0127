import { PageContainer } from '@repo/ui';

import { buildShareMetadata } from '@/shared/lib/seo/shareMetadata';

import { getPublishedStories } from '@/entities/story/server';

import { StoryListItem } from '@/widgets/story';

import type { Metadata } from 'next';

const BLOG_TITLE = '책 이야기 | page0127.';
const BLOG_DESCRIPTION =
  '읽은 책 이야기와 독서에 관한 글을 모았어요. 독후감과 인물관계도, 숫자로 보는 한국 독서 통계까지.';

/**
 * 글이 하나도 없을 때는 noindex — "첫 이야기를 준비하고 있어요" 한 줄짜리 빈 목록이
 * 색인되면 얇은 페이지로 남는다. 첫 글을 공개하면 저장 때 이 페이지를 다시 만들어 풀린다.
 * getPublishedStories 는 unstable_cache 라 page 와 두 번 불러도 DB 는 한 번이다.
 */
export async function generateMetadata(): Promise<Metadata> {
  const stories = await getPublishedStories();
  return {
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    alternates: { canonical: '/blog' },
    ...buildShareMetadata({
      path: '/blog',
      title: BLOG_TITLE,
      description: BLOG_DESCRIPTION,
    }),
    ...(stories.length === 0 && { robots: { index: false, follow: true } }),
  };
}

/**
 * 책 이야기 목록 (/blog) — 정적 페이지(ISR). 어드민에서 글을 저장하면 다시 만든다.
 *
 * 리스트형(HJ 2026-11-24): 제목·소개·날짜가 주인공이고, 썸네일은 따로 만들지 않는다.
 * 글이 적을 때 격자는 빈칸이 많아 보이고, 자동 썸네일은 서로 비슷해 보이기 쉬워서다.
 * 오른쪽 작은 그림은 글에 이미 있는 것(관계도·첫 차트 숫자)에서 고른다 — StoryListItem.
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
            읽은 책 이야기와 독서에 관한 글을 모았어요.
          </p>
        </header>
        {stories.length === 0 ? (
          <p className='rounded-2xl border border-line p-6 text-center text-sm text-text-subtle'>
            첫 이야기를 준비하고 있어요.
          </p>
        ) : (
          <ul className='divide-y divide-line-soft border-y border-line-soft'>
            {stories.map((story) => (
              <li key={story.id}>
                <StoryListItem story={story} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
