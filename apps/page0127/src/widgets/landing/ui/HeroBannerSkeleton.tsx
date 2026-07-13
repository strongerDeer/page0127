import { Skeleton } from '@/shared/ui/skeleton';

/**
 * HeroBannerSection fallback
 *
 * 로딩(Suspense)과 실패(ErrorBoundary) 양쪽에서 같은 외곽을 쓴다.
 * 배너 표지를 못 가져와도 랜딩 첫 화면의 높이가 무너지지 않게 실제 배너와
 * 같은 높이(320/400px)를 유지한다.
 */
export const HeroBannerSkeleton = () => {
  return (
    <div className='h-[320px] overflow-hidden rounded-xl bg-sunken md:h-[400px]'>
      <div className='mx-auto flex h-full max-w-6xl items-center px-8 md:px-12'>
        <div className='space-y-4'>
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-9 w-64 md:h-11 md:w-80' />
          <Skeleton className='h-9 w-56 md:h-11 md:w-72' />
          <Skeleton className='h-4 w-72' />
          <Skeleton className='h-10 w-36 rounded-md' />
        </div>
      </div>
    </div>
  );
};
