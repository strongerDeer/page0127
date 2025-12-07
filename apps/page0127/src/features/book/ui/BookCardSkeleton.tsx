import { Card } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

/**
 * BookCard 로딩 상태 Skeleton 컴포넌트
 *
 * 학습 포인트:
 * - Skeleton UI로 로딩 상태 개선
 * - 실제 컴포넌트와 유사한 레이아웃 유지
 * - 사용자 경험 향상
 */
export const BookCardSkeleton = () => {
  return (
    <Card className='flex overflow-hidden'>
      {/* 책 표지 영역 */}
      <Skeleton className='h-48 w-36 flex-shrink-0' />

      {/* 책 정보 영역 */}
      <div className='flex flex-1 flex-col p-6'>
        <div className='flex-1 space-y-3'>
          {/* 제목 */}
          <Skeleton className='h-6 w-3/4' />

          {/* 저자/출판사 */}
          <Skeleton className='h-4 w-1/2' />

          {/* 상태 배지 */}
          <Skeleton className='h-6 w-20' />

          {/* 한줄평 */}
          <Skeleton className='h-4 w-full' />

          {/* 태그 */}
          <div className='flex gap-2'>
            <Skeleton className='h-6 w-16' />
            <Skeleton className='h-6 w-16' />
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className='mt-4 flex gap-2'>
          <Skeleton className='h-9 w-16' />
          <Skeleton className='h-9 w-16' />
        </div>
      </div>
    </Card>
  );
};
