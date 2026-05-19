import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { StatsPageLayout } from '@/shared/ui/StatsPageLayout';

/**
 * Dashboard 로딩 상태 Skeleton
 *
 * 학습 포인트:
 * - 실제 DashboardContent와 동일한 6블록 레이아웃을 흉내
 * - StatsPageLayout을 그대로 써서 페이지 외곽이 흔들리지 않음 (CLS 방지)
 * - 차트 영역은 next/dynamic의 loading과 동일 높이로 맞춤 (700px / 300px)
 */
export const DashboardSkeleton = () => {
  return (
    <StatsPageLayout>
      {/* ① Header */}
      <header className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div className='space-y-2'>
          <Skeleton className='h-10 w-48' />
          <Skeleton className='h-5 w-64' />
        </div>
        <div className='flex items-center gap-4'>
          <Skeleton className='h-10 w-[140px]' />
          <Skeleton className='h-10 w-32' />
          <Skeleton className='h-10 w-10' />
        </div>
      </header>

      {/* ② Top Stat Cards 4개 */}
      <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
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

      {/* ③④ Main Grid */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Left: Charts (col-span-2) */}
        <div className='space-y-6 lg:col-span-2'>
          {/* Yearly Trend Chart */}
          <Card className='border border-white/40 bg-white/60 shadow-xl backdrop-blur-xl'>
            <CardHeader>
              <Skeleton className='h-6 w-48' />
            </CardHeader>
            <CardContent>
              <Skeleton className='h-[300px] w-full rounded-lg' />
            </CardContent>
          </Card>
          {/* Monthly & Category Charts */}
          <Skeleton className='h-[700px] w-full rounded-3xl' />
        </div>

        {/* Right: Side Widgets */}
        <div className='space-y-6'>
          {/* Reading Journey */}
          <Card className='border border-white/40 bg-gradient-to-br from-white/60 to-white/30 shadow-xl backdrop-blur-xl'>
            <CardHeader>
              <Skeleton className='h-6 w-32' />
            </CardHeader>
            <CardContent className='space-y-3'>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-3/4' />
              <Skeleton className='h-4 w-2/3' />
            </CardContent>
          </Card>

          {/* Goal Progress */}
          <div className='rounded-3xl border border-white/40 bg-white/50 p-6 shadow-xl backdrop-blur-xl'>
            <Skeleton className='mb-4 h-6 w-32' />
            <Skeleton className='h-3 w-full rounded-full' />
            <div className='mt-3 flex justify-between'>
              <Skeleton className='h-4 w-16' />
              <Skeleton className='h-4 w-16' />
            </div>
          </div>

          {/* Taste Analysis Promo — 로딩 단계에선 다른 카드와 동일한 회색 톤 유지 */}
          <div className='rounded-3xl border border-white/40 bg-white/50 p-6 shadow-xl backdrop-blur-xl'>
            <Skeleton className='h-6 w-40' />
            <Skeleton className='mt-3 h-4 w-full' />
            <Skeleton className='mt-4 h-10 w-full' />
          </div>
        </div>
      </div>

      {/* ⑤ Calendar */}
      <div className='rounded-3xl border border-white/40 bg-white/60 p-6 shadow-xl backdrop-blur-xl'>
        <div className='mb-6 flex items-center justify-between'>
          <Skeleton className='h-7 w-40' />
          <div className='flex gap-2'>
            <Skeleton className='h-9 w-9' />
            <Skeleton className='h-9 w-9' />
          </div>
        </div>
        {/* 7x6 캘린더 그리드 */}
        <div className='grid grid-cols-7 gap-2'>
          {Array.from({ length: 42 }).map((_, i) => (
            <Skeleton key={i} className='aspect-square w-full' />
          ))}
        </div>
      </div>

      {/* ⑥ Book List */}
      <div className='rounded-3xl border border-white/40 bg-white/60 p-1 shadow-xl backdrop-blur-xl'>
        <Card className='border-0 bg-transparent shadow-none'>
          <CardHeader>
            <Skeleton className='h-7 w-40' />
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4'>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className='space-y-3'>
                  <Skeleton className='aspect-[2/3] w-full rounded-lg' />
                  <Skeleton className='h-4 w-3/4' />
                  <Skeleton className='h-3 w-1/2' />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </StatsPageLayout>
  );
};
