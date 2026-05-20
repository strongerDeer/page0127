import { Skeleton } from '@/shared/ui/skeleton';

import { BookListItemSkeleton } from '@/widgets/book/ui/BookListItemSkeleton';

/**
 * BookRankingList fallback
 *
 * 학습 포인트:
 * - 한 영역에 5권이 표시되므로 5개 BookListItemSkeleton 배치
 * - 헤더(제목/서브타이틀) + 그리드까지 실제와 동일한 외곽 유지
 */
export const BookRankingListSkeleton = () => {
  return (
    <section className='py-8'>
      <div className='mb-6 flex items-end justify-between'>
        <div className='space-y-2'>
          <Skeleton className='h-8 w-64' />
          <Skeleton className='h-4 w-80' />
        </div>
      </div>

      <div className='grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className='flex flex-col gap-2'>
            <BookListItemSkeleton />
            <Skeleton className='mx-auto h-3 w-16' />
          </div>
        ))}
      </div>
    </section>
  );
};
