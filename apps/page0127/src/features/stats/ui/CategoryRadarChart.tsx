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
  /** 차트 높이(px) — 기본 300. '100%'면 감싼 칸의 높이를 따른다(균형 카드: 모바일 220 · md 340) */
  height?: number | '100%';
};

/** 카테고리별 독서 취향을 한눈에 보여주는 레이더 차트 */
export const CategoryRadarChart = ({
  data,
  height = 300,
}: CategoryRadarChartProps) => {
  if (data.length === 0) {
    return (
      <div
        className='flex items-center justify-center text-sm text-text-subtle'
        style={{ height }}
      >
        책을 완독하면 카테고리 취향이 표시됩니다.
      </div>
    );
  }

  return (
    <div className='w-full' style={{ height }}>
      <ResponsiveContainer width='100%' height='100%'>
        <RadarChart
          data={data}
          cx='50%'
          cy='50%'
          outerRadius='74%'
          // 좌우 여백은 '예술/대중문화' 같은 긴 라벨이 잘리지 않을 만큼
          margin={{ top: 24, right: 52, bottom: 24, left: 52 }}
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
