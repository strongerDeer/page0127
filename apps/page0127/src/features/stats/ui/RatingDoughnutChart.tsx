'use client';

import { Star } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

import type { RatingReadingData } from '@/entities/book';

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
      <div className='flex h-[300px] items-center justify-center text-muted-foreground'>
        평점 데이터가 없습니다
      </div>
    );
  }

  return (
    <div>
      {/* 차트만 relative 로 — 중앙 오버레이가 (차트+범례)가 아닌 차트 높이에 정렬되도록 */}
      <div className='relative'>
        <ResponsiveContainer width='100%' height={300}>
          <PieChart>
            <Pie
              data={filteredData}
              dataKey='count'
              nameKey='rating'
              cx='50%'
              cy='50%'
              innerRadius={66}
              outerRadius={100}
              paddingAngle={2}
              // Recharts 애니메이션이 React 19에서 리렌더 burst를 유발 → 비활성화
              isAnimationActive={false}
              onClick={(entry) => {
                // recharts Pie onClick 은 PieSectorDataItem 을 넘긴다.
                // 원본 데이터는 payload 에 들어 있으므로 거기서 rating 을 꺼낸다.
                const payload = (entry as { payload?: { rating: number } })
                  .payload;
                if (payload) onRatingClick(payload.rating);
              }}
              className='cursor-pointer'
            >
              {filteredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* 중앙에 평균 평점 표시 — 도넛 구멍 안에 2줄로 컴팩트하게 */}
        <div className='pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center'>
          <div className='text-3xl font-bold leading-none text-text-strong'>
            {averageRating.toFixed(1)}
          </div>
          <div className='mt-1.5 flex items-center justify-center gap-0.5 text-xs text-text-subtle'>
            <Star className='h-3 w-3 fill-chart-7 text-chart-7' />
            평균 평점
          </div>
        </div>
      </div>

      {/* 범례 */}
      <div className='mt-4 flex flex-wrap justify-center gap-3'>
        {filteredData.map((item) => (
          <button
            key={item.rating}
            onClick={() => onRatingClick(item.rating)}
            className='flex items-center gap-1 rounded-lg px-3 py-1 text-sm transition-colors hover:bg-accent'
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
