'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
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
};

/**
 * 월별 독서량 Bar Chart 컴포넌트
 *
 * 학습 포인트:
 * - Recharts의 BarChart 사용법
 * - ResponsiveContainer로 반응형 차트 구현
 * - onClick 이벤트로 인터랙션 추가
 * - Tailwind CSS로 스타일링
 *
 * @example
 * <MonthlyReadingChart
 *   data={stats.monthlyReading}
 *   onMonthClick={(month) => router.push(`/books?month=${month}`)}
 * />
 */
export const MonthlyReadingChart = ({
  data,
  onMonthClick,
}: MonthlyReadingChartProps) => {
  // Bar 클릭 핸들러
  const handleBarClick = (data: unknown) => {
    const d = data as { month?: number } | null;
    if (onMonthClick && d && d.month) {
      onMonthClick(d.month);
    }
  };

  return (
    <div className='h-[300px] w-full'>
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart
          data={data}
          margin={{ top: 16, right: 12, left: -20, bottom: 0 }}
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
            tickFormatter={(month) => `${month}월`}
            tick={{ fill: 'var(--text-faint)', fontSize: 12 }}
          />

          {/* Y축: 권수 */}
          <YAxis
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            tick={{ fill: 'var(--text-faint)', fontSize: 12 }}
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
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
