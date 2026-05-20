import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { StatsPageLayout } from '@/shared/ui/StatsPageLayout';

import { BookListItemSkeleton } from '@/widgets/book/ui/BookListItemSkeleton';

/**
 * 공개 서재 페이지 fallback
 *
 * 학습 포인트:
 * - PublicLibraryContent와 동일한 StatsPageLayout 사용 (CLS 방지)
 * - 헤더 / 연도 select / Stat 4개 / 차트 / 책 목록 구조를 그대로 흉내
 */
export const PublicLibrarySkeleton = () => {
  return (
    <StatsPageLayout bg='gradient' maxWidth='6xl'>
      {/* 프로필 헤더 */}
      <div className='flex items-center gap-6 rounded-3xl border-2 border-white/60 bg-white/40 p-8 shadow-sm backdrop-blur-2xl'>
        <Skeleton className='h-24 w-24 rounded-full' />
        <div className='space-y-2'>
          <Skeleton className='h-7 w-48' />
          <Skeleton className='h-5 w-32' />
          <Skeleton className='h-4 w-64' />
        </div>
      </div>

      {/* 연도 헤더 */}
      <div className='flex items-center justify-between rounded-2xl border-2 border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-2xl'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-10 w-[140px]' />
      </div>

      {/* Stat Cards 4개 */}
      <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card
            key={i}
            className='border-2 border-white/60 bg-gradient-to-br from-white/80 to-white/40 shadow-xl backdrop-blur-2xl'
          >
            <CardContent className='flex items-center justify-between p-6'>
              <div className='space-y-2'>
                <Skeleton className='h-4 w-20' />
                <Skeleton className='h-8 w-16' />
              </div>
              <Skeleton className='h-12 w-12 rounded-2xl' />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 차트 영역 */}
      <div className='rounded-3xl border-2 border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-2xl'>
        <Skeleton className='mb-6 h-7 w-32' />
        <Skeleton className='h-[500px] w-full rounded-2xl' />
      </div>

      {/* 책 목록 */}
      <div className='rounded-3xl border-2 border-white/60 bg-white/40 p-8 shadow-sm backdrop-blur-2xl'>
        <Skeleton className='mb-6 h-7 w-40' />
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
          {Array.from({ length: 10 }).map((_, i) => (
            <BookListItemSkeleton key={i} />
          ))}
        </div>
      </div>
    </StatsPageLayout>
  );
};
