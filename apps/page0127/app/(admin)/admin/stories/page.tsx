import Link from 'next/link';

import { Plus } from 'lucide-react';

import { formatStoryShortDate } from '@/entities/story';

import { getAdminStories } from '@/features/admin-stories/api/getAdminStories';

export default async function AdminStoriesPage() {
  const stories = await getAdminStories();

  return (
    <section>
      <div className='mb-4 flex items-start justify-between gap-4'>
        <div>
          <h1 className='mb-1 text-base font-medium'>책 이야기</h1>
          <p className='text-xs text-text-subtle'>
            독후감·인물관계도·독서 이야기(/blog). 저장하면 배포 없이 바로 공개
            페이지에 반영돼요.
          </p>
        </div>
        <Link
          href='/admin/stories/new'
          className='inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground'
        >
          <Plus className='size-4' aria-hidden />새 글
        </Link>
      </div>

      {stories === null ? (
        <p className='text-sm text-destructive'>
          목록을 불러오지 못했어요. 새로고침해 주세요.
        </p>
      ) : stories.length === 0 ? (
        <p className='text-sm text-text-subtle'>아직 글이 없어요.</p>
      ) : (
        <ul className='divide-y divide-line rounded-md border border-line'>
          {stories.map((story) => (
            <li key={story.id}>
              <Link
                href={`/admin/stories/${story.id}`}
                className='flex items-center gap-3 p-3 hover:bg-accent'
              >
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-xs ${story.isPublished ? 'bg-primary/10 text-primary' : 'bg-muted text-text-subtle'}`}
                >
                  {story.isPublished ? '공개' : '초안'}
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block truncate text-sm font-medium'>
                    {story.title}
                  </span>
                  <span className='block truncate text-xs text-text-subtle'>
                    {story.bookTitle || '독서 이야기'} · /blog/{story.slug}
                  </span>
                </span>
                <span className='shrink-0 text-xs text-text-subtle'>
                  {formatStoryShortDate(story.updatedAt)} 수정
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
