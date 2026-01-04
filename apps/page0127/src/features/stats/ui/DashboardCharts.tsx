'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

import { CategoryRadarChart } from './CategoryRadarChart';
import { MonthlyReadingChart } from './MonthlyReadingChart';
import { RatingDoughnutChart } from './RatingDoughnutChart';

import type {
  CategoryReadingData,
  MonthlyReadingData,
  RatingReadingData,
} from '@/entities/book/types/stats';

type DashboardChartsProps = {
  monthlyReading: MonthlyReadingData[];
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
  categoryReading,
  ratingReading,
  averageRating,
  onMonthClick,
  onRatingClick,
}: DashboardChartsProps) => {
  return (
    <div className='mb-10 space-y-6'>
      {/* 월별 독서량 차트 - 전체 너비 */}
      <Card className='border-0 shadow-md'>
        <CardHeader className='pb-4'>
          <CardTitle className='text-xl font-bold tracking-tight'>월별 독서량</CardTitle>
          <p className='text-sm text-gray-500'>
            막대를 클릭하면 해당 월의 책 목록을 볼 수 있습니다
          </p>
        </CardHeader>
        <CardContent className='pb-6'>
          <MonthlyReadingChart
            data={monthlyReading}
            onMonthClick={onMonthClick}
          />
        </CardContent>
      </Card>

      {/* 카테고리 & 평점 차트 - 2열 레이아웃 */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        {/* 카테고리별 독서량 차트 */}
        <Card className='border-0 shadow-md'>
          <CardHeader className='pb-4'>
            <CardTitle className='text-xl font-bold tracking-tight'>카테고리별 독서량</CardTitle>
            <p className='text-sm text-gray-500'>
              카테고리 필터는 아래 읽은 책 섹션에서 사용할 수 있습니다
            </p>
          </CardHeader>
          <CardContent className='pb-6'>
            <CategoryRadarChart data={categoryReading} />
          </CardContent>
        </Card>

        {/* 평점 분포 차트 */}
        <Card className='border-0 shadow-md'>
          <CardHeader className='pb-4'>
            <CardTitle className='text-xl font-bold tracking-tight'>평점 분포</CardTitle>
            <p className='text-sm text-gray-500'>
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
