import Link from 'next/link';

import { ArrowRight } from 'lucide-react';

import { getStoryByBookId, storyPath } from '@/entities/story';

/**
 * 책 정보 페이지 → 책 이야기로 가는 카드. 이야기가 있는 책에서만 그린다.
 *
 * 목록은 코드(entities/story)에 있어 DB 조회가 없다 — 책 정보 페이지의 캐시(ISR)를 깨지 않는다.
 */
export const StoryLinkCard = ({ bookId }: { bookId: string }) => {
  const story = getStoryByBookId(bookId);
  if (!story) return null;

  return (
    <Link
      href={storyPath(story.slug)}
      className='group flex items-center justify-between gap-4 rounded-2xl border border-line p-4 transition-colors hover:bg-muted'
    >
      <div className='min-w-0'>
        <p className='text-xs font-semibold text-primary'>책 이야기</p>
        <p className='mt-0.5 font-semibold text-text-strong'>
          독후감과 인물관계도
        </p>
        <p className='mt-0.5 text-sm text-text-subtle'>
          등장인물을 시대별로 한 장에 정리했어요
        </p>
      </div>
      <ArrowRight
        aria-hidden='true'
        className='size-5 shrink-0 text-text-subtle transition-transform group-hover:translate-x-0.5'
      />
    </Link>
  );
};
