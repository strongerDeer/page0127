import Link from 'next/link';

import { ArrowRight } from 'lucide-react';

import { storyPath } from '@/entities/story';
import { getLatestStoryForBook } from '@/entities/story/server';

/**
 * 책 정보 페이지 → 책 이야기로 가는 카드. 공개 글이 있는 책에서만 그린다.
 *
 * 공개 글 목록은 한 벌만 캐시해서(getPublishedStories) 책 정보 페이지마다 DB 를 부르지 않는다.
 * 어드민에서 글을 공개하면 책 정보 페이지 캐시도 함께 버린다(revalidateStoryPages).
 */
export const StoryLinkCard = async ({ bookId }: { bookId: string }) => {
  const story = await getLatestStoryForBook(bookId);
  if (!story) return null;

  const hasMap = Boolean(story.mapImage);

  return (
    <Link
      href={storyPath(story.slug)}
      className='group flex items-center justify-between gap-4 rounded-2xl border border-line p-4 transition-colors hover:bg-muted'
    >
      <div className='min-w-0'>
        <p className='text-xs font-semibold text-primary'>책 이야기</p>
        <p className='mt-0.5 font-semibold break-keep text-text-strong'>
          {hasMap ? '독후감과 인물관계도' : '독후감'}
        </p>
        <p className='mt-0.5 text-sm break-keep text-text-subtle'>
          {story.title}
        </p>
      </div>
      <ArrowRight
        aria-hidden='true'
        className='size-5 shrink-0 text-text-subtle transition-transform group-hover:translate-x-0.5'
      />
    </Link>
  );
};
