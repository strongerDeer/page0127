'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  categoricalColor,
  chartInk,
  chartTooltipStyle,
} from '@/shared/lib/chartStyles';

import type { CategoryReadingData } from '@/entities/book';

type CategoryBarChartProps = {
  /** 카테고리별 독서량 데이터 */
  data: CategoryReadingData[];
};

/**
 * 카테고리별 독서량 — 멀티컬러 막대 차트
 *
 * 카테고리(문학·인문·과학…)는 서로 다른 정체성이라 색을 하나씩 달리 준다.
 * 색은 항목(카테고리)을 따라가고 순위를 따라가지 않도록 정렬 후 index 로 고정 배정.
 */
export const CategoryBarChart = ({ data }: CategoryBarChartProps) => {
  if (data.length === 0) {
    return (
      <div className='flex h-75 w-full items-center justify-center text-muted-foreground'>
        카테고리 데이터가 없습니다
      </div>
    );
  }

  // 많이 읽은 카테고리부터 (원본 불변)
  const sorted = [...data].sort((a, b) => b.count - a.count);

  return (
    <div className='h-75 w-full'>
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart
          data={sorted}
          margin={{ top: 12, right: 8, left: -12, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray='3 3'
            vertical={false}
            stroke={chartInk.grid}
          />
          <XAxis
            dataKey='category'
            axisLine={false}
            tickLine={false}
            interval={0}
            tick={{ fill: chartInk.axis, fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={32}
            tick={{ fill: chartInk.axis, fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: chartInk.cursor }}
            contentStyle={chartTooltipStyle}
            formatter={(value) => [`${value}권`, '독서량']}
          />
          <Bar
            dataKey='count'
            radius={[8, 8, 0, 0]}
            barSize={40}
            // Recharts 애니메이션이 React 19에서 리렌더 burst를 유발 → 비활성화
            isAnimationActive={false}
          >
            {sorted.map((entry, index) => (
              <Cell key={entry.category} fill={categoricalColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
