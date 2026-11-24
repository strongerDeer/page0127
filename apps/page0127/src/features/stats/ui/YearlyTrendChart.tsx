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

type Goal = { year: number; target: number };

type Props = {
  data: YearlyTrend[];
  /** 해마다 정한 목표(reading_goals) — 막대 위에 점선 테두리로 겹쳐 그린다 */
  goals?: Goal[];
  /** false 면 채운 목표만 그린다 — 방문자에게 못 채운 목표는 성적표로 읽힌다 */
  showUnmetGoals?: boolean;
};

/** 막대 폭 — 목표 막대를 같은 폭으로 정확히 겹치려고 둘이 같은 값을 쓴다 */
const BAR_SIZE = 40;

/**
 * 그 해 완독 권수에 목표를 붙인다. 목표가 없거나 숨길 목표면 goal 은 undefined → 목표 막대가 안 그려진다.
 * (recharts 는 값이 없는 칸의 막대를 건너뛴다)
 */
export const withGoals = (
  data: YearlyTrend[],
  goals: Goal[],
  showUnmetGoals: boolean
) => {
  const goalByYear = new Map(goals.map((g) => [g.year, g.target]));
  return data.map((item) => {
    const target = goalByYear.get(item.year);
    const visible =
      target !== undefined && (showUnmetGoals || item.count >= target);
    return { ...item, goal: visible ? target : undefined };
  });
};

export const YearlyTrendChart = ({
  data,
  goals = [],
  showUnmetGoals = true,
}: Props) => {
  if (data.length === 0) {
    return (
      <div className='flex h-[300px] items-center justify-center text-sm text-text-subtle'>
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
  const chartData = withGoals(data, goals, showUnmetGoals);
  const hasGoals = chartData.some((item) => item.goal !== undefined);
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
        <BarChart
          data={chartData}
          margin={{ top: 12, right: 8, left: -16 }}
          // 목표 막대를 완독 막대 위에 정확히 포갠다(같은 폭만큼 뒤로 당김)
          barGap={-BAR_SIZE}
        >
          <CartesianGrid
            strokeDasharray='3 5'
            vertical={false}
            stroke='var(--line-soft)'
          />
          <XAxis
            dataKey='year'
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-subtle)', fontSize: 12 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            tick={{ fill: 'var(--text-subtle)', fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: 'var(--sunken)' }}
            contentStyle={chartTooltipStyle}
            formatter={(value, name) => [`${value}권`, name]}
            labelFormatter={(label) => `${label}년`}
          />
          <Bar
            dataKey='count'
            fill='var(--line)'
            name='독서량'
            radius={[6, 6, 6, 6]}
            barSize={BAR_SIZE}
            isAnimationActive={false}
          >
            {data.map((item) => (
              <Cell
                key={item.year}
                fill={
                  item.year === highlightYear ? 'var(--primary)' : 'var(--line)'
                }
              />
            ))}
          </Bar>
          {/* 목표 — 완독 막대 다음에 그려 테두리가 위에 온다. 면은 비우고 점선만:
              넘친 해는 막대가 점선 위로 솟고, 모자란 해는 빈 점선 칸이 남는다 */}
          {hasGoals && (
            <Bar
              dataKey='goal'
              name='목표'
              fill='transparent'
              stroke='var(--text-subtle)'
              strokeDasharray='4 3'
              strokeWidth={1.5}
              radius={[6, 6, 6, 6]}
              barSize={BAR_SIZE}
              isAnimationActive={false}
            />
          )}
        </BarChart>
      </ResponsiveContainer>

      <div className='text-center text-sm text-text-subtle'>
        {hasGoals && (
          <p className='mb-1 flex items-center justify-center gap-1.5 text-xs'>
            <span
              aria-hidden
              className='inline-block h-3 w-3 rounded-[3px] border-[1.5px] border-dashed border-text-subtle'
            />
            점선은 그 해 목표예요
          </p>
        )}
        <p>
          <span className='font-medium text-text-strong'>
            {peakYear.year}년
          </span>
          이 최고 기록이에요. ({peakYear.count}권)
        </p>
        {previousYear && growthRate !== 0 && (
          <p className='mt-1 text-xs text-text-subtle'>
            전년 대비 {growthRate > 0 ? '+' : ''}
            {growthRate}%
          </p>
        )}
      </div>
    </div>
  );
};
