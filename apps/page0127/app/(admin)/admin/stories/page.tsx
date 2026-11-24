import Link from 'next/link';

import { Plus } from 'lucide-react';

import {
  kstToday,
  parseDateRange,
  type RangeSearchParams,
} from '@/shared/lib/admin/dateRange';

import { formatStoryShortDate } from '@/entities/story';

import { getStoryViews } from '@/features/admin-analytics/api/getStoryViews';
import { getAdminStories } from '@/features/admin-stories/api/getAdminStories';

import { PeriodPicker } from '@/widgets/admin/ui/PeriodPicker';

// 조회수는 GA 를 매번 새로 묻는다 — 관리자만 보는 화면이라 호출 수가 적다
export const dynamic = 'force-dynamic';

type AdminStoriesPageProps = { searchParams: Promise<RangeSearchParams> };

/** 1,234 · 0 은 "—" (GA 에 아직 기록이 없는 글) */
const formatCount = (value: number | undefined) =>
  value ? value.toLocaleString('ko-KR') : '—';

export default async function AdminStoriesPage({
  searchParams,
}: AdminStoriesPageProps) {
  const now = new Date();
  const range = parseDateRange(await searchParams, now);
  // 글 목록(DB)과 조회수(GA)는 서로 기다릴 필요가 없다
  const [stories, views] = await Promise.all([
    getAdminStories(),
    getStoryViews(range),
  ]);

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

      <div className='mb-3 flex flex-col gap-1.5'>
        <PeriodPicker
          basePath='/admin/stories'
          range={range}
          maxDate={kstToday(now)}
        />
        <p className='text-xs text-text-subtle'>
          조회 = 기간 안 페이지뷰 · 사람 수 (GA, 한국 접속만 · 하루쯤 늦게
          반영될 수 있어요)
          {views.status === 'unconfigured' && ' — GA 설정이 없어 못 불러왔어요'}
          {views.status === 'error' && ' — 지금은 GA 를 불러오지 못했어요'}
        </p>
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
                {views.status === 'ok' && (
                  <span className='w-20 shrink-0 text-right text-xs tabular-nums text-text-body'>
                    <b className='font-semibold text-text-strong'>
                      {formatCount(views.bySlug.get(story.slug)?.views)}
                    </b>{' '}
                    조회
                    <span className='block text-text-subtle'>
                      {formatCount(views.bySlug.get(story.slug)?.users)}명
                    </span>
                  </span>
                )}
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
