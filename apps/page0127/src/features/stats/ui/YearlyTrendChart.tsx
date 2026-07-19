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

import { chartTooltipStyle } from '@/shared/lib/chartStyles';

import type { YearlyTrend } from '@/entities/book';

type Props = { data: YearlyTrend[] };

export const YearlyTrendChart = ({ data }: Props) => {
  if (data.length === 0) {
    return (
      <div className='flex h-[300px] items-center justify-center text-sm text-text-faint'>
        연도별 독서 기록이 아직 없습니다.
      </div>
    );
  }

  const peakYear = data.reduce((max, item) =>
    item.count > max.count ? item : max
  );
  // 강조할 연도 = 올해. 단, 올해 기록이 없어 막대가 없으면 가장 최신 연도로 폴백.
  const thisYear = new Date().getFullYear();
  const highlightYear = data.some((d) => d.year === thisYear)
    ? thisYear
    : data[data.length - 1].year;
  const currentYear = data[data.length - 1];
  const previousYear = data[data.length - 2];
  const growthRate =
    previousYear && previousYear.count > 0
      ? Math.round(
          ((currentYear.count - previousYear.count) / previousYear.count) * 100
        )
      : 0;

  return (
    <div className='flex flex-col gap-2'>
      <ResponsiveContainer width='100%' height={300}>
        <BarChart data={data} margin={{ top: 12, right: 8, left: -16 }}>
          <CartesianGrid
            strokeDasharray='3 5'
            vertical={false}
            stroke='var(--line-soft)'
          />
          <XAxis
            dataKey='year'
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-faint)', fontSize: 12 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            tick={{ fill: 'var(--text-faint)', fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: 'var(--sunken)' }}
            contentStyle={chartTooltipStyle}
            formatter={(value) => [`${value}권`, '독서량']}
            labelFormatter={(label) => `${label}년`}
          />
          <Bar
            dataKey='count'
            fill='var(--line)'
            name='독서량'
            radius={[6, 6, 6, 6]}
            barSize={40}
            isAnimationActive={false}
          >
            {data.map((item) => (
              <Cell
                key={item.year}
                fill={
                  item.year === highlightYear
                    ? 'var(--primary)'
                    : 'var(--line)'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className='text-center text-sm text-text-subtle'>
        <p>
          <span className='font-semibold text-text-strong'>
            {peakYear.year}년
          </span>
          이 최고 기록이에요. ({peakYear.count}권)
        </p>
        {previousYear && growthRate !== 0 && (
          <p className='mt-1 text-xs text-text-faint'>
            전년 대비 {growthRate > 0 ? '+' : ''}
            {growthRate}%
          </p>
        )}
      </div>
    </div>
  );
};
