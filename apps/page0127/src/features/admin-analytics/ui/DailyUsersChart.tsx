'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { chartInk, chartTooltipStyle } from '@/shared/lib/chartStyles';

import type { DailyPoint } from '../lib/insights';

type DailyUsersChartProps = {
  points: DailyPoint[];
  /** 지난주 대비 변화율 — 제목 옆 요약 */
  weekOverWeek: number | null;
};

/**
 * 일별 사용자 추이. 계열이 하나라 범례 없이 제목이 이름을 대신한다.
 * 0명인 날도 점이 찍혀야 "그날 아무도 안 왔다"가 보인다 — fillDaily 가 채워 준다.
 */
export const DailyUsersChart = ({
  points,
  weekOverWeek,
}: DailyUsersChartProps) => (
  <div className='rounded-lg border border-line p-4'>
    <div className='flex items-baseline justify-between gap-2'>
      <div className='text-sm font-medium'>일별 사용자</div>
      {weekOverWeek !== null && (
        <span className='text-xs text-text-subtle'>
          최근 7일 · 지난주 대비{' '}
          <span className='font-medium text-text-strong'>
            {weekOverWeek >= 0 ? '+' : ''}
            {Math.round(weekOverWeek * 100)}%
          </span>
        </span>
      )}
    </div>
    <ResponsiveContainer width='100%' height={200}>
      <AreaChart data={points} margin={{ top: 12, right: 8, left: -16 }}>
        <defs>
          <linearGradient id='dailyUsersFill' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0%' stopColor={chartInk.primary} stopOpacity={0.25} />
            <stop offset='100%' stopColor={chartInk.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          stroke={chartInk.grid}
          strokeDasharray='3 3'
          vertical={false}
        />
        <XAxis
          dataKey='label'
          tick={{ fill: chartInk.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval='preserveStartEnd'
          minTickGap={24}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: chartInk.axis, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={chartTooltipStyle}
          formatter={(value) => [
            `${Number(value).toLocaleString('ko-KR')}명`,
            '사용자',
          ]}
        />
        <Area
          type='monotone'
          dataKey='users'
          stroke={chartInk.primary}
          strokeWidth={2}
          fill='url(#dailyUsersFill)'
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);
