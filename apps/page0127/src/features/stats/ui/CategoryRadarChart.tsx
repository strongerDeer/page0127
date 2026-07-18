'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import { chartTooltipStyle } from '@/shared/lib/chartStyles';

import type { CategoryReadingData } from '@/entities/book';

type CategoryRadarChartProps = {
  data: CategoryReadingData[];
};

/** 카테고리별 독서 취향을 한눈에 보여주는 레이더 차트 */
export const CategoryRadarChart = ({ data }: CategoryRadarChartProps) => {
  if (data.length === 0) {
    return (
      <div className='flex h-[300px] items-center justify-center text-sm text-text-faint'>
        책을 완독하면 카테고리 취향이 표시됩니다.
      </div>
    );
  }

  return (
    <div className='h-[300px] w-full'>
      <ResponsiveContainer width='100%' height='100%'>
        <RadarChart
          data={data}
          cx='50%'
          cy='50%'
          outerRadius='68%'
          margin={{ top: 20, right: 40, bottom: 20, left: 40 }}
        >
          <PolarGrid stroke='var(--line)' radialLines={false} />
          <PolarAngleAxis
            dataKey='category'
            tick={{ fill: 'var(--text-subtle)', fontSize: 12 }}
            tickLine={false}
          />
          <PolarRadiusAxis axisLine={false} tick={false} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(value) => [`${value}권`, '완독']}
          />
          <Radar
            dataKey='count'
            stroke='var(--primary)'
            strokeWidth={2}
            fill='var(--primary)'
            fillOpacity={0.18}
            dot={{ r: 3, fill: 'var(--primary)', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: 'var(--primary)', stroke: 'white' }}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
