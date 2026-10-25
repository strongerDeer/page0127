'use client';

import { QueryErrorState } from '@/shared/ui/QueryErrorState';

export const ReadingLeagueLoading = () => (
  <div
    role='status'
    aria-label='올해의 독서 리그 불러오는 중'
    className='w-full max-w-2xl rounded-3xl border border-line p-6'
  >
    <span className='sr-only'>올해의 독서 리그를 불러오고 있어요.</span>
    <div aria-hidden='true' className='motion-safe:animate-pulse'>
      <div className='mb-8 h-5 w-40 rounded bg-muted' />
      <div className='flex justify-around py-6'>
        <div className='size-20 rounded-full bg-muted' />
        <div className='size-20 rounded-full bg-muted' />
      </div>
      <div className='my-8 h-6 rounded-full bg-muted' />
      <div className='mx-auto my-6 h-5 w-48 rounded bg-muted' />
    </div>
  </div>
);

export const ReadingLeagueError = ({
  onRetry,
  isRetrying,
}: {
  onRetry: () => void;
  isRetrying: boolean;
}) => (
  <div className='w-full max-w-2xl'>
    <QueryErrorState
      message='올해의 독서 리그를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
      onRetry={onRetry}
      isRetrying={isRetrying}
    />
  </div>
);
