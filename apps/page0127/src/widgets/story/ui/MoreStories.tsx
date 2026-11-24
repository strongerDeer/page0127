import { getPublishedStories } from '@/entities/story/server';

import { StoryListItem } from './StoryListItem';

const MORE_COUNT = 2;

/**
 * 글 끝 "다른 이야기" — 지금 글을 빼고 최신 2편 (HJ 2026-11-24 시안).
 * 끝까지 읽은 사람이 다음 글로 넘어가게. 목록 캐시(getPublishedStories)를 같이 써서 DB 를 더 부르지 않는다.
 * 실패하거나 다른 글이 없으면 칸을 그리지 않는다 — 이 칸 때문에 글 페이지가 깨지면 안 된다.
 */
export const MoreStories = async ({ currentId }: { currentId: string }) => {
  const stories = await getPublishedStories().catch(() => []);
  const others = stories
    .filter((story) => story.id !== currentId)
    .slice(0, MORE_COUNT);
  if (others.length === 0) return null;

  return (
    <section
      aria-labelledby='more-stories'
      className='border-t border-line pt-8'
    >
      <h2 id='more-stories' className='heading-2'>
        다른 이야기
      </h2>
      <ul className='mt-2 divide-y divide-line-soft'>
        {others.map((story) => (
          <li key={story.id}>
            <StoryListItem story={story} headingLevel='h3' />
          </li>
        ))}
      </ul>
    </section>
  );
};
