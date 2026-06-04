import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

/**
 * 책 상세 페이지 fallback
 *
 * 학습 포인트:
 * - 페이지 전체 라우트 단위 스켈레톤 (loading.tsx에서 사용)
 * - 실제 페이지의 2컬럼 그리드(표지 / 정보)와 통계 카드 2개를 그대로 흉내
 * - 표지는 책 본래 비율(1:1.4)로 자리 잡아 CLS 방지
 */
export const BookDetailSkeleton = () => {
  return (
    <div className='min-h-screen p-8'>
      <div className='mx-auto max-w-4xl'>
        {/* Header — 뒤로가기 + 액션 버튼 */}
        <div className='mb-6 flex items-center justify-between'>
          <Skeleton className='h-10 w-32' />
          <Skeleton className='h-10 w-36' />
        </div>

        <div className='grid gap-6 md:grid-cols-[240px_1fr]'>
          {/* Left: 표지 + ReaderProfiles */}
          <div className='space-y-6'>
            <Skeleton className='aspect-[1/1.4] w-full rounded-lg' />
            {/* ReaderProfiles 영역 */}
            <div className='space-y-2'>
              <Skeleton className='h-5 w-32' />
              <div className='flex gap-2'>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className='h-10 w-10 rounded-full' />
                ))}
              </div>
            </div>
          </div>

          {/* Right: 책 정보 + 통계 + 메모 + 소개 */}
          <div className='space-y-6'>
            {/* 제목/저자/출판사 */}
            <div className='space-y-2'>
              <Skeleton className='h-9 w-3/4' />
              <Skeleton className='h-6 w-1/2' />
              <Skeleton className='h-5 w-2/5' />
            </div>

            {/* 통계 카드 2개 */}
            <div className='grid grid-cols-2 gap-4'>
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className='flex flex-col items-center justify-center p-6'>
                    <Skeleton className='mb-2 h-12 w-12 rounded-full' />
                    <Skeleton className='mb-1 h-4 w-20' />
                    <Skeleton className='h-7 w-16' />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 나의 기록 (메모) */}
            <Card>
              <CardContent className='space-y-3 p-6'>
                <Skeleton className='h-5 w-24' />
                <Skeleton className='h-20 w-full' />
              </CardContent>
            </Card>

            {/* 책 소개 */}
            <Card>
              <CardContent className='space-y-3 p-6'>
                <Skeleton className='h-6 w-24' />
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-4 w-5/6' />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
