'use client';

import { Star } from 'lucide-react';

import type { RatingReadingData } from '@/entities/book';

type RatingDoughnutChartProps = {
  data: RatingReadingData[];
  averageRating: number;
  onRatingClick: (rating: number) => void;
};

/** 평균 평점과 평점별 권수를 함께 보여주는 분포 */
export const RatingDoughnutChart = ({
  data,
  averageRating,
  onRatingClick,
}: RatingDoughnutChartProps) => {
  const filteredData = data
    .filter((item) => item.count > 0)
    .sort((a, b) => b.rating - a.rating);
  const total = filteredData.reduce((sum, item) => sum + item.count, 0);

  if (filteredData.length === 0) {
    return (
      <div className='flex h-[280px] items-center justify-center text-sm text-text-faint'>
        책에 평점을 남기면 분포가 표시됩니다.
      </div>
    );
  }

  return (
    <div className='min-h-[280px]'>
      <div className='flex items-end gap-3 pb-6'>
        <strong className='text-4xl font-bold tracking-[-0.04em] text-text-strong'>
          {averageRating.toFixed(1)}
        </strong>
        <div className='pb-1'>
          <div className='flex items-center gap-1 text-rank-up'>
            <Star className='size-4 fill-current' />
            <span className='text-sm font-semibold'>평균 평점</span>
          </div>
          <p className='mt-0.5 text-xs text-text-faint'>{total}권 기준</p>
        </div>
      </div>

      <div className='space-y-3'>
        {filteredData.map((item) => {
          const percentage = total > 0 ? (item.count / total) * 100 : 0;

          return (
            <button
              key={item.rating}
              type='button'
              onClick={() => onRatingClick(item.rating)}
              className='grid w-full grid-cols-[42px_1fr_36px] items-center gap-3 text-sm'
            >
              <span className='text-left font-medium text-text-body'>
                {item.rating}점
              </span>
              <span className='h-2 overflow-hidden rounded-full bg-sunken'>
                <span
                  className='block h-full rounded-full bg-primary/70 transition-colors hover:bg-primary'
                  style={{ width: `${percentage}%` }}
                />
              </span>
              <span className='text-right text-text-subtle'>{item.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
