import { Skeleton } from '@/shared/ui/skeleton';

import { BookListItemSkeleton } from '@/widgets/book/ui/BookListItemSkeleton';

/**
 * /books/all 라우트 로딩 UI
 *
 * 학습 포인트:
 * - page.tsx의 6개 await가 끝나기 전까지 즉시 노출
 * - 실제 페이지와 동일한 헤더 + 그리드 + 페이지네이션 외곽 유지
 * - 그리드 컬럼 수도 실제와 동일하게 (sm:3, md:4, lg:5, xl:6)
 */
export default function Loading() {
  return (
    <div className='container mx-auto max-w-7xl px-4 py-8'>
      {/* Header */}
      <div className='mb-8 flex items-center justify-between'>
        <div className='space-y-2'>
          <Skeleton className='h-9 w-56' />
          <Skeleton className='h-5 w-80' />
        </div>
        <div className='flex gap-2'>
          <Skeleton className='h-9 w-16' />
          <Skeleton className='h-9 w-16' />
        </div>
      </div>

      {/* Book Grid — 한 페이지 limit이 20이라 12개 정도 그려두면 첫 화면 충분 */}
      <div className='grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
        {Array.from({ length: 12 }).map((_, i) => (
          <BookListItemSkeleton key={i} />
        ))}
      </div>

      {/* Pagination */}
      <div className='mt-12 flex justify-center gap-2'>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className='h-9 w-9' />
        ))}
      </div>
    </div>
  );
}
