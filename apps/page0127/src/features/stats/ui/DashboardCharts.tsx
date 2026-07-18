'use client';

import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

import { CategoryRadarChart } from './CategoryRadarChart';
import { MonthlyReadingChart } from './MonthlyReadingChart';
import { RatingDoughnutChart } from './RatingDoughnutChart';
import { YearlyTrendChart } from './YearlyTrendChart';

import type {
  CategoryReadingData,
  MonthlyReadingData,
  RatingReadingData,
  YearlyTrend,
} from '@/entities/book';

type DashboardChartsProps = {
  monthlyReading: MonthlyReadingData[];
  yearlyReading: YearlyTrend[];
  categoryReading: CategoryReadingData[];
  ratingReading: RatingReadingData[];
  averageRating: number;
  onMonthClick: (month: number) => void;
  onRatingClick: (rating: number) => void;
};

/**
 * 대시보드 차트 섹션 (Client Component)
 *
 * 학습 포인트:
 * - Server Component에서 데이터를 받아 Client Component에서 인터랙션 처리
 * - 부모로부터 받은 핸들러로 대시보드 내 필터링 처리 (페이지 이동 X)
 * - 클릭 이벤트 핸들러 구현
 * - 3개 차트: 월별, 카테고리별, 평점별
 *
 * @example
 * <DashboardCharts
 *   monthlyReading={stats.monthlyReading}
 *   categoryReading={stats.categoryReading}
 *   ratingReading={stats.ratingReading}
 *   averageRating={stats.averageRating}
 *   onMonthClick={handleMonthClick}
 *   onRatingClick={handleRatingClick}
 * />
 */
export const DashboardCharts = ({
  monthlyReading,
  yearlyReading,
  categoryReading,
  ratingReading,
  averageRating,
  onMonthClick,
  onRatingClick,
}: DashboardChartsProps) => {
  const [trendPeriod, setTrendPeriod] = useState<'monthly' | 'yearly'>(
    'monthly'
  );

  return (
    <div className='mb-10 space-y-6'>
      {/* 같은 성격의 시간 추이는 한 카드 안에서 기간만 전환한다. */}
      <Card className='rounded-2xl bg-card py-6 shadow-none'>
        <CardHeader className='pb-4'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
            <div>
              <CardTitle className='text-lg font-bold tracking-tight text-foreground'>
                독서 추이
              </CardTitle>
              <p className='mt-2 text-sm text-muted-foreground'>
                {trendPeriod === 'monthly'
                  ? '막대를 클릭하면 해당 월의 책을 모아볼 수 있습니다'
                  : '최근 연도별 완독 권수를 비교합니다'}
              </p>
            </div>

            <div
              role='tablist'
              aria-label='독서 추이 기간'
              className='flex w-fit rounded-lg bg-sunken p-1'
            >
              {(['monthly', 'yearly'] as const).map((period) => {
                const isSelected = trendPeriod === period;
                return (
                  <button
                    key={period}
                    type='button'
                    role='tab'
                    aria-selected={isSelected}
                    onClick={() => setTrendPeriod(period)}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-card text-text-strong'
                        : 'text-text-subtle hover:text-text-strong'
                    }`}
                  >
                    {period === 'monthly' ? '월별' : '연도별'}
                  </button>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className='pb-6'>
          {trendPeriod === 'monthly' ? (
            <MonthlyReadingChart
              data={monthlyReading}
              onMonthClick={onMonthClick}
            />
          ) : (
            <YearlyTrendChart data={yearlyReading} />
          )}
        </CardContent>
      </Card>

      {/* 카테고리 & 평점 차트 - 2열 레이아웃 */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        {/* 카테고리별 독서량 차트 */}
        <Card className='rounded-2xl bg-card py-6 shadow-none'>
          <CardHeader className='pb-4'>
            <CardTitle className='text-lg font-bold tracking-tight text-foreground'>
              카테고리 취향
            </CardTitle>
            <p className='text-sm text-muted-foreground'>
              완독한 책을 기준으로 정리했습니다
            </p>
          </CardHeader>
          <CardContent className='pb-6'>
            <CategoryRadarChart data={categoryReading} />
          </CardContent>
        </Card>

        {/* 평점 분포 차트 */}
        <Card className='rounded-2xl bg-card py-6 shadow-none'>
          <CardHeader className='pb-4'>
            <CardTitle className='text-lg font-bold tracking-tight text-foreground'>
              평점 분포
            </CardTitle>
            <p className='text-sm text-muted-foreground'>
              평점을 클릭하면 해당 평점의 책 목록을 볼 수 있습니다
            </p>
          </CardHeader>
          <CardContent className='pb-6'>
            <RatingDoughnutChart
              data={ratingReading}
              averageRating={averageRating}
              onRatingClick={onRatingClick}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
