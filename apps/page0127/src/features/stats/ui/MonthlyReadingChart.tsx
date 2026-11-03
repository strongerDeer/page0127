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

import type { MonthlyReadingData } from '@/entities/book';

type MonthlyReadingChartProps = {
  /** 월별 독서량 데이터 (1-12월) */
  data: MonthlyReadingData[];

  /** Bar 클릭 이벤트 핸들러 (선택사항) */
  onMonthClick?: (month: number) => void;

  /** 이번 달 — 민트로 칠한다. 올해 탭이 아니면 넘기지 않는다 */
  currentMonth?: number;
};

/**
 * 월별 독서량 막대 차트 — 서재 연도 뷰, 독서 캘린더 옆.
 *
 * PR #193(2026-10-13)에서 달력 월 칩이 대신한다며 뺐지만, 칩은 완독한 달에 점만 찍어
 * "달마다 몇 권"이 안 보였다 → 그때 차트를 그대로 되살린다.
 * 막대를 누르면 onMonthClick 으로 그 달을 알린다(부모가 캘린더를 그 달로 넘긴다).
 */
export const MonthlyReadingChart = ({
  data,
  onMonthClick,
  currentMonth,
}: MonthlyReadingChartProps) => {
  // recharts 3 은 막대 클릭에 (막대 정보, 순서) 를 넘긴다 — 순서로 원본 데이터를 찾는 게 버전에 덜 민감하다
  const handleBarClick = (_bar: unknown, index: number) => {
    const month = data[index]?.month;
    if (onMonthClick && month) onMonthClick(month);
  };

  // 캘린더 옆 보조 차트라 낮게 — 300px 이면 오른쪽 칸이 캘린더보다 한참 길어진다
  return (
    <div className='h-[180px] w-full'>
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, left: -28, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke='var(--line-soft)'
            strokeDasharray='3 5'
          />

          {/* X축: 월 (1-12) */}
          <XAxis
            dataKey='month'
            axisLine={false}
            tickLine={false}
            // 모바일 폭에서도 12달이 다 보이게 숫자만, 건너뛰지 않는다('N월'은 툴팁에)
            interval={0}
            tickFormatter={(month) => `${month}`}
            tick={{ fill: 'var(--text-subtle)', fontSize: 12 }}
          />

          {/* Y축: 권수 */}
          <YAxis
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            tick={{ fill: 'var(--text-subtle)', fontSize: 12 }}
          />

          {/* 툴팁 */}
          <Tooltip
            cursor={{ fill: 'var(--sunken)' }}
            contentStyle={chartTooltipStyle}
            formatter={(value) => [`${value}권`, '독서량']}
            labelFormatter={(label) => `${label}월`}
          />

          {/* Bar */}
          <Bar
            dataKey='count'
            fill='var(--primary)'
            radius={[6, 6, 6, 6]}
            cursor={onMonthClick ? 'pointer' : 'default'}
            onClick={handleBarClick}
            // Recharts 애니메이션이 React 19에서 리렌더 burst를 유발 → 비활성화
            isAnimationActive={false}
          >
            {/* 이번 달 = 민트(읽는 중 책갈피와 같은 --teal-500), 나머지는 기본 파랑 */}
            {data.map((item) => (
              <Cell
                key={item.month}
                fill={
                  item.month === currentMonth
                    ? 'var(--teal-500)'
                    : 'var(--primary)'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
