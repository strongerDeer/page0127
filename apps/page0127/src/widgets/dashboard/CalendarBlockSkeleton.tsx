import { Skeleton } from '@/shared/ui/skeleton';

/**
 * Calendar 영역 fallback
 *
 * 학습 포인트:
 * - <Suspense fallback={...}> 자리에 들어가는 작은 단위 스켈레톤
 * - 라우트 전체 fallback(loading.tsx)이 아닌 컴포넌트 단위
 * - 실제 캘린더 카드와 동일한 외곽 + 7×6 그리드를 흉내내 CLS 방지
 */
export const CalendarBlockSkeleton = () => {
  return (
    <div className='rounded-2xl border border-line-soft bg-card p-5'>
      <div className='mb-5 flex items-center justify-between'>
        <Skeleton className='h-6 w-28' />
        <div className='flex gap-2'>
          <Skeleton className='size-8' />
          <Skeleton className='h-8 w-20' />
          <Skeleton className='size-8' />
        </div>
      </div>
      <div className='grid grid-cols-7 gap-1'>
        {Array.from({ length: 42 }).map((_, i) => (
          <Skeleton key={i} className='h-9 w-full' />
        ))}
      </div>
    </div>
  );
};
