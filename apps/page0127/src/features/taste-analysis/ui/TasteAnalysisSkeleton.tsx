import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

/**
 * AI 취향 분석 결과 페이지 fallback
 *
 * 학습 포인트:
 * - 페이지 라우트 단위 스켈레톤
 * - 실제 결과는 성향 카드 + 선호도 카드 + 추천 3그룹(match/expand/challenge)
 */
export const TasteAnalysisSkeleton = () => {
  return (
    <div className='min-h-screen p-8'>
      <div className='mx-auto max-w-4xl'>
        {/* Header */}
        <div className='mb-8 space-y-3'>
          <Skeleton className='h-9 w-32' />
          <Skeleton className='h-9 w-80' />
          <Skeleton className='h-5 w-64' />
        </div>

        {/* 성향 카드 */}
        <Card className='mb-6'>
          <CardHeader>
            <Skeleton className='h-6 w-40' />
          </CardHeader>
          <CardContent className='space-y-3'>
            <Skeleton className='h-16 w-full rounded-lg' />
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-5/6' />
            <Skeleton className='h-4 w-3/4' />
          </CardContent>
        </Card>

        {/* 선호도 프로필 카드 */}
        <Card className='mb-6'>
          <CardHeader>
            <Skeleton className='h-6 w-48' />
          </CardHeader>
          <CardContent className='space-y-6'>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className='space-y-3'>
                <Skeleton className='h-5 w-32' />
                <div className='flex flex-wrap gap-2'>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className='h-7 w-20 rounded-full' />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 추천 도서 — 3그룹 */}
        {Array.from({ length: 3 }).map((_, group) => (
          <Card key={group} className='mb-6'>
            <CardHeader>
              <Skeleton className='h-6 w-40' />
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4'>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className='space-y-3'>
                    <Skeleton className='aspect-[2/3] w-full rounded-md' />
                    <Skeleton className='h-4 w-3/4' />
                    <Skeleton className='h-3 w-1/2' />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
