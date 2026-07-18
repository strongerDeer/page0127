import { Skeleton } from '@/shared/ui/skeleton';

/**
 * BookRankingList fallback
 *
 * 학습 포인트:
 * - 실제 리스트와 같은 외곽(제목 줄 + 행 5개 카드)을 유지해
 *   로딩 → 도착 시 레이아웃이 튀지 않게 한다
 */
export const BookRankingListSkeleton = () => {
  return (
    <section>
      <div className='mb-3 flex items-baseline justify-between'>
        <Skeleton className='h-7 w-48' />
        <Skeleton className='h-4 w-24' />
      </div>

      <div className='divide-y divide-line-soft border-t border-line'>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className='flex items-center gap-4 py-3.5'>
            <Skeleton className='h-5 w-5 shrink-0' />
            <Skeleton className='h-20 w-14 shrink-0' />
            <div className='flex-1 space-y-2'>
              <Skeleton className='h-4 w-3/4' />
              <Skeleton className='h-3 w-1/3' />
              <Skeleton className='h-3 w-20' />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
