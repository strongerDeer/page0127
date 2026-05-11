'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import type { CategoryReadingData } from '@/entities/book';

type CategoryRadarChartProps = {
  /** 카테고리별 독서량 데이터 */
  data: CategoryReadingData[];
};

/**
 * 카테고리별 독서량 Radar Chart 컴포넌트
 *
 * 학습 포인트:
 * - Recharts의 RadarChart 사용법
 * - PolarGrid, PolarAngleAxis로 레이더 차트 구조 생성
 * - 반응형 차트 구현
 * - 시각화 전용 (클릭 기능 제거, 필터는 Chip으로 처리)
 *
 * @example
 * <CategoryRadarChart data={stats.categoryReading} />
 */
export const CategoryRadarChart = ({ data }: CategoryRadarChartProps) => {

  // 데이터가 없는 경우 처리
  if (data.length === 0) {
    return (
      <div className='flex h-[300px] w-full items-center justify-center text-gray-400'>
        카테고리 데이터가 없습니다
      </div>
    );
  }

  return (
    <div className='h-[300px] w-full'>
      <ResponsiveContainer width='100%' height='100%'>
        <RadarChart data={data} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
          {/* 레이더 그리드 */}
          <PolarGrid stroke='#e5e7eb' />

          {/* 카테고리명 (각도별 레이블) */}
          <PolarAngleAxis
            dataKey='category'
            tick={{
              fill: '#6b7280',
              fontSize: 12,
            }}
          />

          {/* 툴팁 */}
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            formatter={(value) => [`${value}권`, '독서량']}
          />

          {/* 레이더 */}
          <Radar
            dataKey='count'
            stroke='#6366f1'
            fill='#6366f1'
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
