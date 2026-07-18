import { PageContainer } from '@/shared/ui/PageContainer';
import { Skeleton } from '@/shared/ui/skeleton';

/** 공개 서재의 실제 레이아웃과 같은 폭·리듬을 사용하는 로딩 화면 */
export const PublicLibrarySkeleton = () => {
  return (
    <PageContainer width='wide' className='space-y-10'>
      <header className='flex flex-col gap-6 md:flex-row md:items-center md:justify-between'>
        <div className='flex items-center gap-5'>
          <Skeleton className='size-20 rounded-full' />
          <div className='space-y-3'>
            <Skeleton className='h-4 w-20' />
            <Skeleton className='h-9 w-56' />
            <Skeleton className='h-4 w-72 max-w-full' />
          </div>
        </div>
        <div className='flex gap-2'>
          <Skeleton className='h-9 w-32' />
          <Skeleton className='h-9 w-24' />
          <Skeleton className='size-9' />
        </div>
      </header>

      <section className='py-6'>
        <div className='mb-6 flex items-center justify-between'>
          <Skeleton className='h-6 w-28' />
          <Skeleton className='h-8 w-44' />
        </div>
        <div className='flex h-72 items-end gap-6 overflow-hidden px-4'>
          {[152, 190, 166, 204, 178, 188].map((height, index) => (
            <Skeleton
              key={index}
              className='w-32 shrink-0 rounded-t-sm'
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
            <Skeleton className='h-3 w-full rounded-full' />
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

      <section className='space-y-7'>
        <div className='space-y-2'>
          <Skeleton className='h-8 w-48' />
          <Skeleton className='h-4 w-72' />
        </div>
        <Skeleton className='h-[500px] w-full rounded-none' />
      </section>
    </PageContainer>
  );
};
