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
  /** users = 사람 추정(한국), all = GA 전체(봇 포함) */
  points: (DailyPoint & { all: number })[];
  /** 마지막 7일 vs 그 전 7일 변화율 — 제목 옆 요약 */
  weekOverWeek: number | null;
};

/**
 * 일별 사용자 추이 — 사람 추정(초록 면)과 GA 전체(회색 점선)를 겹쳐 그린다.
 * 둘 사이가 벌어진 날이 봇이 몰린 날이다(예: 2026-10-26 전체 62 · 사람 8).
 * 0명인 날도 점이 찍혀야 "그날 아무도 안 왔다"가 보인다 — fillDaily 가 채워 준다.
 */
export const DailyUsersChart = ({
  points,
  weekOverWeek,
}: DailyUsersChartProps) => (
  <div className='rounded-lg border border-line p-4'>
    <div className='flex items-baseline justify-between gap-2'>
      <div className='flex flex-wrap items-baseline gap-x-3 gap-y-1'>
        <div className='text-sm font-medium'>일별 사용자</div>
        <span className='flex items-center gap-1 text-xs text-text-subtle'>
          <span
            aria-hidden='true'
            className='inline-block h-0.5 w-3'
            style={{ background: chartInk.primary }}
          />
          사람 추정
        </span>
        <span className='flex items-center gap-1 text-xs text-text-subtle'>
          <span
            aria-hidden='true'
            className='inline-block w-3 border-t border-dashed'
            style={{ borderColor: chartInk.axis }}
          />
          GA 전체(봇 포함)
        </span>
      </div>
      {weekOverWeek !== null && (
        <span className='text-xs text-text-subtle'>
          마지막 7일 · 그 전 7일 대비{' '}
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
          formatter={(value, name) => [
            `${Number(value).toLocaleString('ko-KR')}명`,
            name === 'all' ? 'GA 전체' : '사람 추정',
          ]}
        />
        <Area
          type='monotone'
          dataKey='all'
          stroke={chartInk.axis}
          strokeWidth={1.5}
          strokeDasharray='4 3'
          fill='none'
          dot={false}
          activeDot={{ r: 3 }}
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
