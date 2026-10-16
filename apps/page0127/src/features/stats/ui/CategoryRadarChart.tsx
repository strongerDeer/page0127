'use client';

import { useCallback, useState } from 'react';

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

import { radarLayout } from '../model/radarLayout';

import type { CategoryReadingData } from '@/entities/book';

type CategoryRadarChartProps = {
  data: CategoryReadingData[];
  /** 차트 높이(px) — 기본 300. '100%'면 감싼 칸의 높이를 따른다(균형 카드: 모바일 260 · md 340) */
  height?: number | '100%';
};

/** 카테고리별 독서 취향을 한눈에 보여주는 레이더 차트 */
export const CategoryRadarChart = ({
  data,
  height = 300,
}: CategoryRadarChartProps) => {
  // 칸 폭에 따라 라벨 길이·좌우 여백을 고른다 — 모바일에선 짧게, 레이더는 크게.
  // 폭은 직접 잰다: ResponsiveContainer 의 onResize 는 크기가 "바뀔 때"만 불려
  // 처음 그린 폭(휴대폰에서 끝까지 안 바뀜)을 알려 주지 않았다
  const [width, setWidth] = useState(0);
  const layout = radarLayout(width);
  const measureRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
    <div ref={measureRef} className='w-full' style={{ height }}>
      <ResponsiveContainer width='100%' height='100%'>
        <RadarChart
          data={data}
          cx='50%'
          cy='50%'
          outerRadius='74%'
          // 좌우 여백은 긴 라벨 자리 — 넓으면 '예술/대중문화'가 잘리지 않을 만큼, 좁으면 줄인 이름만큼
          margin={layout.margin}
        >
          <PolarGrid stroke='var(--line)' radialLines={false} />
          <PolarAngleAxis
            dataKey='category'
            tick={{ fill: 'var(--text-subtle)', fontSize: 12 }}
            tickFormatter={layout.label}
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
