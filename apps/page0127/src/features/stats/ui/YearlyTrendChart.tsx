'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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
  /**
   * 해마다 정한 목표(reading_goals) — 막대 위에 테두리 상자로 겹쳐 그린다.
   * 주인에게만 넘긴다: 방문자 차트에는 목표를 그리지 않는다(HJ, 2026-11-24)
   */
  goals?: Goal[];
};

/** 막대 폭 — 목표 막대를 같은 폭으로 정확히 겹치려고 둘이 같은 값을 쓴다 */
const BAR_SIZE = 40;

/**
 * 그 해 완독 권수에 목표를 붙인다(HJ 시안, 2026-11-24).
 * 목표는 완독 막대 위에 같은 폭의 진한 테두리 상자(속 비움)로 겹친다 —
 * 못 채운 해는 상자가 막대 위로 남고, 넘긴 해는 상자 윗변이 막대 안에 보인다.
 * 목표가 없거나 숨길 목표면 둘 다 undefined → 아무것도 안 그린다(recharts 는 값 없는 칸을 건너뛴다)
 */
export type GoalStatus = 'met' | 'inProgress' | 'missed';

/** 달성 여부 문구 — 툴팁과 체크 아이콘의 읽기용 이름 */
export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  met: '달성',
  inProgress: '진행 중',
  missed: '미달성',
};

export const withGoals = (
  data: YearlyTrend[],
  goals: Goal[],
  currentYear = new Date().getFullYear()
) => {
  const goalByYear = new Map(goals.map((g) => [g.year, g.target]));
  return data.map((item) => {
    const goal = goalByYear.get(item.year);
    const met = goal !== undefined && item.count >= goal;
    // 올해는 아직 끝나지 않았으니 못 채웠어도 '미달성'이 아니라 '진행 중'
    const status: GoalStatus | undefined =
      goal === undefined
        ? undefined
        : met
          ? 'met'
          : item.year >= currentYear
            ? 'inProgress'
            : 'missed';
    return {
      ...item,
      goal,
      status,
      // 달성 표시를 올릴 높이 — 완독·목표 중 높은 쪽 바로 위
      labelTop: goal === undefined ? undefined : Math.max(item.count, goal),
    };
  });
};

export const YearlyTrendChart = ({ data, goals = [] }: Props) => {
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
  const chartData = withGoals(data, goals);
  const hasGoals = chartData.some((item) => item.goal !== undefined);
  const hasMet = chartData.some((item) => item.status === 'met');
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
          margin={{ top: 24, right: 8, left: -16 }}
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
            // 목표는 막대가 둘(뒤 막대·가로선)로 나뉘어 있어 툴팁에선 '목표' 한 줄로 합친다
            content={({ active, payload, label }) => {
              const item = payload?.[0]?.payload as
                | (YearlyTrend & { goal?: number; status?: GoalStatus })
                | undefined;
              if (!active || !item) return null;
              return (
                <div style={chartTooltipStyle}>
                  <p className='font-medium'>{label}년</p>
                  <p>완독 {item.count}권</p>
                  {item.goal !== undefined && (
                    <p>
                      목표 {item.goal}권
                      {item.status && ` · ${GOAL_STATUS_LABEL[item.status]}`}
                    </p>
                  )}
                </div>
              );
            }}
          />
          {/* ② 완독 — 올해는 파랑, 지난해는 회색 */}
          <Bar
            dataKey='count'
            name='완독'
            radius={[6, 6, 6, 6]}
            barSize={BAR_SIZE}
            isAnimationActive={false}
          >
            {chartData.map((item) => (
              <Cell
                key={item.year}
                fill={
                  item.year === highlightYear ? 'var(--primary)' : 'var(--line)'
                }
              />
            ))}
          </Bar>
          {/* ③ 목표 — 완독 막대 위에 테두리 상자(속 비움) */}
          {hasGoals && (
            <Bar
              dataKey='goal'
              name='목표'
              barSize={BAR_SIZE}
              isAnimationActive={false}
              shape={(props: {
                x?: number;
                y?: number;
                width?: number;
                height?: number;
                payload?: YearlyTrend;
              }) => {
                const { x = 0, y = 0, width = 0, height = 0, payload } = props;
                // 올해 목표는 완독 막대와 같은 파랑, 지난해는 연한 남색
                const stroke =
                  payload?.year === highlightYear
                    ? 'var(--primary)'
                    : 'var(--navy-300)';
                if (height <= 0) return <g />;
                // 선 두께 절반만큼 안으로 들여 막대 밖으로 번지지 않게
                return (
                  <rect
                    x={x + 0.75}
                    y={y + 0.75}
                    width={Math.max(width - 1.5, 0)}
                    height={Math.max(height - 1.5, 0)}
                    rx={6}
                    fill='none'
                    stroke={stroke}
                    strokeWidth={1.5}
                  />
                );
              }}
            />
          )}
          {/* ④ 달성한 해 — 보이지 않는 막대 꼭대기에 원형 체크 아이콘만 올린다(HJ, 2026-11-24) */}
          {hasMet && (
            <Bar
              dataKey='labelTop'
              barSize={BAR_SIZE}
              fill='transparent'
              isAnimationActive={false}
              legendType='none'
            >
              <LabelList
                dataKey='status'
                content={(props) => {
                  const {
                    x = 0,
                    y = 0,
                    width = 0,
                    value,
                  } = props as {
                    x?: number;
                    y?: number;
                    width?: number;
                    value?: GoalStatus;
                  };
                  if (value !== 'met') return null;
                  const cx = Number(x) + Number(width) / 2;
                  const cy = Number(y) - 13;
                  return (
                    <g role='img' aria-label={GOAL_STATUS_LABEL.met}>
                      <title>목표 {GOAL_STATUS_LABEL.met}</title>
                      <circle cx={cx} cy={cy} r={9} fill='var(--primary)' />
                      <path
                        d={`M${cx - 4} ${cy} l2.8 2.8 l5.2 -5.6`}
                        fill='none'
                        stroke='var(--primary-foreground)'
                        strokeWidth={1.8}
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </g>
                  );
                }}
              />
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>

      <div className='text-center text-sm text-text-subtle'>
        {hasGoals && (
          <p className='mb-1 flex items-center justify-center gap-3 text-xs'>
            <span className='flex items-center gap-1'>
              <span
                aria-hidden
                className='inline-block h-3 w-3 rounded-[3px] border-[1.5px] border-[var(--navy-300)]'
              />
              목표
            </span>
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
