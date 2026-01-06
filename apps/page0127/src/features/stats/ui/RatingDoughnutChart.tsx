'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { Star } from 'lucide-react';

import type { RatingReadingData } from '@/entities/book/types/stats';

type RatingDoughnutChartProps = {
  /** 평점별 독서량 데이터 */
  data: RatingReadingData[];

  /** 평균 평점 */
  averageRating: number;

  /** 평점 클릭 핸들러 */
  onRatingClick: (rating: number) => void;
};

/**
 * 평점 분포 도넛 차트 (Client Component)
 *
 * 학습 포인트:
 * - Recharts PieChart를 이용한 도넛 차트 구현
 * - innerRadius로 도넛 형태 만들기
 * - 중앙에 평균 평점 표시 (절대 위치)
 * - 클릭 이벤트로 평점별 필터링
 * - count > 0인 항목만 표시
 * - 평점 범위: 0, 1, 2, 3, 4, 5, 10점 (7가지)
 *
 * @example
 * <RatingDoughnutChart
 *   data={stats.ratingReading}
 *   averageRating={stats.averageRating}
 *   onRatingClick={handleRatingClick}
 * />
 */
export const RatingDoughnutChart = ({
  data,
  averageRating,
  onRatingClick,
}: RatingDoughnutChartProps) => {
  // count > 0인 데이터만 필터링
  const filteredData = data.filter((item) => item.count > 0);

  // 평점이 없는 경우
  if (filteredData.length === 0) {
    return (
      <div className='flex h-[300px] items-center justify-center text-gray-400'>
        평점 데이터가 없습니다
      </div>
    );
  }

  return (
    <div className='relative'>
      <ResponsiveContainer width='100%' height={300}>
        <PieChart>
          <Pie
            data={filteredData}
            dataKey='count'
            nameKey='rating'
            cx='50%'
            cy='50%'
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            onClick={(entry) => onRatingClick(entry.rating)}
            className='cursor-pointer'
          >
            {filteredData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* 중앙에 평균 평점 표시 */}
      <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center'>
        <div className='text-3xl font-bold text-slate-800'>
          {averageRating.toFixed(1)}
        </div>
        <div className='text-sm text-slate-500'>평균 평점</div>
        <div className='flex justify-center mt-1'>
           <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
        </div>
      </div>

      {/* 범례 */}
      <div className='mt-4 flex flex-wrap justify-center gap-3'>
        {filteredData.map((item) => (
          <button
            key={item.rating}
            onClick={() => onRatingClick(item.rating)}
            className='flex items-center gap-1 rounded-lg px-3 py-1 text-sm transition-colors hover:bg-gray-100'
          >
            <div
              className='h-3 w-3 rounded-full'
              style={{ backgroundColor: item.fill }}
            />
            <span className='font-medium'>
              {item.rating}점 ({item.count})
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
