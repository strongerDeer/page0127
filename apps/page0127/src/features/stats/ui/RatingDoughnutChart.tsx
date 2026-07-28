'use client';

import { Star } from 'lucide-react';

import { isRated } from '@/entities/book';

import type { RatingReadingData } from '@/entities/book';

type RatingDoughnutChartProps = {
  data: RatingReadingData[];
  averageRating: number;
  onRatingClick: (rating: number) => void;
};

// 평점 숫자 → 라벨. isLifeBook 이 참이면 "인생책", 0은 점수가 아니라 "평가 안 함"이다
// (OverallDistribution 과 같은 규칙)
// 그룹핑 자체(10을 인생책 버킷으로 묶는 것)는 아직 이전 방식 그대로다 — Task 3에서
// is_life_book 기준으로 바꾼다. 여기서는 시그니처만 맞춰 둔다.
const ratingLabel = (rating: number, isLifeBook: boolean) =>
  isLifeBook ? '인생책' : isRated(rating) ? `${rating}점` : '평가 안 함';

/** 평균 평점과 평점별 권수를 함께 보여주는 분포 */
export const RatingDoughnutChart = ({
  data,
  averageRating,
  onRatingClick,
}: RatingDoughnutChartProps) => {
  const filteredData = data
    .filter((item) => item.count > 0)
    .sort((a, b) => b.rating - a.rating);
  // 막대 폭의 분모 — 분포 전체(평가 안 함 포함) 대비 비율이라 그대로 둔다
  const total = filteredData.reduce((sum, item) => sum + item.count, 0);
  // 캡션의 분모 — 평균(averageScore)이 0("평가 안 함")을 빼고 계산하므로
  // 캡션도 같은 모집단을 세야 한다. 안 그러면 바로 아래 0점 막대에 눈으로 검산된다.
  const ratedTotal = filteredData
    .filter((item) => isRated(item.rating))
    .reduce((sum, item) => sum + item.count, 0);

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
            <span className='text-sm font-medium'>평균 평점</span>
          </div>
          <p className='mt-0.5 text-xs text-text-faint'>{ratedTotal}권 기준</p>
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
              // 라벨 폭: '평가 안 함'이 한 줄에 들어가야 한다 (42px에서는 줄바꿈됐다)
              className='grid w-full grid-cols-[64px_1fr_36px] items-center gap-3 text-sm'
            >
              <span className='text-left font-medium text-text-body'>
                {/* 그룹핑은 아직 이전 방식(Task 3에서 is_life_book 기준으로 교체) —
                    DB에 더 이상 인생책 rating 버킷이 쌓이지 않아 항상 count 0으로
                    필터링되므로 이 플래그는 지금 당장은 쓰이지 않는다 */}
                {ratingLabel(item.rating, false)}
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
