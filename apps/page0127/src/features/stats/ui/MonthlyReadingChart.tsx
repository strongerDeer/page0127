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
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
        >
          {/* 그리드 라인 */}
          <CartesianGrid strokeDasharray='3 3' className='stroke-border' />

          {/* X축: 월 (1-12) */}
          <XAxis
            dataKey='month'
            label={{ value: '월', position: 'insideBottom', offset: -5 }}
            className='text-sm text-muted-foreground'
          />

          {/* Y축: 권수 */}
          <YAxis
            label={{ value: '권수', angle: -90, position: 'insideLeft' }}
            className='text-sm text-muted-foreground'
          />

          {/* 툴팁 */}
          <Tooltip
            cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
            contentStyle={chartTooltipStyle}
            formatter={(value) => [`${value}권`, '독서량']}
            labelFormatter={(label) => `${label}월`}
          />

          {/* Bar */}
          <Bar
            dataKey='count'
            fill='#6366f1'
            radius={[8, 8, 0, 0]}
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
