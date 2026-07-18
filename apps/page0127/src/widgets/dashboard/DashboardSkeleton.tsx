import { PageContainer } from '@/shared/ui/PageContainer';
import { Skeleton } from '@/shared/ui/skeleton';

/** 대시보드의 실제 콘텐츠 순서를 유지해 화면 이동을 줄이는 로딩 화면 */
export const DashboardSkeleton = () => {
  return (
    <PageContainer width='wide' className='space-y-10'>
      <header className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div className='space-y-3'>
          <Skeleton className='h-10 w-40' />
          <Skeleton className='h-4 w-64' />
        </div>
        <div className='flex gap-3'>
          <Skeleton className='h-9 w-36' />
          <Skeleton className='h-9 w-24' />
          <Skeleton className='size-9' />
        </div>
      </header>

      <section className='py-6'>
        <div className='mb-5 flex items-center justify-between'>
          <Skeleton className='h-6 w-36' />
          <Skeleton className='h-8 w-40' />
        </div>
        <div className='flex h-64 items-end gap-3 overflow-hidden px-2'>
          {[176, 210, 188, 202, 164, 194, 184].map((height, index) => (
            <Skeleton
              key={index}
              className='w-28 shrink-0 rounded-t-sm'
              style={{ height }}
            />
          ))}
        </div>
        <Skeleton className='h-2 w-full rounded-none' />
      </section>

      <div className='overflow-hidden rounded-[28px] border border-line-soft'>
        <div className='grid lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]'>
          <div className='space-y-7 p-8 lg:p-10'>
            <div className='space-y-3'>
              <Skeleton className='h-4 w-28' />
              <Skeleton className='h-9 w-72' />
              <Skeleton className='h-4 w-64' />
            </div>
            <div className='space-y-3'>
              <Skeleton className='h-10 w-24' />
              <Skeleton className='h-3 w-full rounded-full' />
            </div>
            <div className='grid grid-cols-3 gap-6'>
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className='space-y-2'>
                  <Skeleton className='h-3 w-16' />
                  <Skeleton className='h-6 w-20' />
                </div>
              ))}
            </div>
          </div>
          <Skeleton className='min-h-64 rounded-none lg:min-h-full' />
        </div>
      </div>

      <div className='grid gap-10 lg:grid-cols-3'>
        <div className='space-y-8 lg:col-span-2'>
          <Skeleton className='h-[700px] w-full rounded-xl' />
        </div>
        <div className='space-y-4'>
          <Skeleton className='h-7 w-32' />
          <Skeleton className='h-48 w-full rounded-xl' />
          <Skeleton className='h-48 w-full rounded-xl' />
        </div>
      </div>
    </PageContainer>
  );
};
