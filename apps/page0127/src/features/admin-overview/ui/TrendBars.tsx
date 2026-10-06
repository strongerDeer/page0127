'use client';

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { chartInk, chartTooltipStyle } from '@/shared/lib/chartStyles';

import type { TrendPoint } from '../lib/trend';

type TrendBarsProps = {
  title: string;
  /** 툴팁 단위 ('명', '권') */
  unit: string;
  points: TrendPoint[];
  /** 제목 옆 요약 (예: '30일 합계 12명') */
  summary: string;
};

/**
 * 날짜별 개수 막대. 하루 단위로 끊기는 셈(가입 0·1·3건)이라 선보다 막대가 정직하다 —
 * 선은 "0과 3 사이에 1.5인 순간"이 있는 것처럼 보인다.
 * 세 지표를 한 차트에 겹치지 않고 따로 그린다: 방문자(수십)와 가입(0~2)은 크기가 달라
 * 한 축에 두면 작은 쪽이 바닥에 붙는다.
 */
export const TrendBars = ({ title, unit, points, summary }: TrendBarsProps) => (
  <div className='rounded-lg border border-line p-4'>
    <div className='flex items-baseline justify-between gap-2'>
      <div className='text-sm font-medium'>{title}</div>
      <span className='text-xs text-text-subtle'>{summary}</span>
    </div>
    <ResponsiveContainer width='100%' height={120}>
      <BarChart
        data={points}
        margin={{ top: 12, right: 4, left: 0, bottom: 0 }}
      >
        <XAxis
          dataKey='label'
          tick={{ fill: chartInk.axis, fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval='preserveStartEnd'
          minTickGap={32}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: chartInk.axis, fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          // 세 자리(책 100권+)까지 잘리지 않는 폭. 음수 여백으로 줄이면 두 자리부터 잘린다
          width={28}
        />
        <Tooltip
          cursor={{ fill: chartInk.cursor }}
          contentStyle={chartTooltipStyle}
          formatter={(value) => [`${Number(value)}${unit}`, title]}
        />
        <Bar dataKey='count' fill={chartInk.primary} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);
