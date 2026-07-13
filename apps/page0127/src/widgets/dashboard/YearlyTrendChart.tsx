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

import type { YearlyTrend } from '@/entities/book';

type Props = {
  data: YearlyTrend[];
};

/**
 * 최근 5년 독서량 막대 차트
 *
 * 학습 포인트:
 * - Recharts BarChart 사용
 * - 연도별 권수 트렌드 시각화
 * - 최고 기록 연도 하이라이트 (선택 사항)
 * - 전년 대비 증가율 계산 (인사이트 메시지)
 *
 * @param data - 연도별 독서량 데이터
 */
export const YearlyTrendChart = ({ data }: Props) => {
  // 데이터가 없으면 빈 상태 표시
  if (data.length === 0) {
    return (
      <div className='flex h-[300px] items-center justify-center text-muted-foreground'>
        <p>데이터가 없습니다</p>
      </div>
    );
  }

  // 최고 기록 연도 찾기
  const peakYear = data.reduce((max, item) =>
    item.count > max.count ? item : max
  );

  // 전년 대비 증가율 계산
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
        <BarChart data={data}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.8}/>
            </linearGradient>
            <linearGradient id="colorCountPeak" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F472B6" stopOpacity={1}/>
              <stop offset="95%" stopColor="#DB2777" stopOpacity={1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray='3 3' vertical={false} stroke="rgba(0,0,0,0.1)" />
          <XAxis
            dataKey='year'
            axisLine={false}
            tickLine={false}
            tick={{fill: '#64748b', fontSize: 12}}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{fill: '#64748b', fontSize: 12}}
          />
          <Tooltip
            cursor={{fill: 'rgba(0,0,0,0.05)'}}
            contentStyle={chartTooltipStyle}
            formatter={(value) => [`${value}권`, '독서량']}
            labelFormatter={(label) => `${label}년`}
          />
          <Bar
            dataKey='count'
            fill='url(#colorCount)'
            name='독서량'
            radius={[6, 6, 6, 6]}
            barSize={40}
            // Recharts 애니메이션(react-smooth)이 React 19에서 완료되지 못하고
            // 리렌더를 과도하게 발생시킨다(Day 67 측정으로 확인) → 비활성화
            isAnimationActive={false}
            shape={(props: unknown) => {
              const p = props as { x?: number; y?: number; width?: number; height?: number; payload?: { year: number } };
              const isPeak = p.payload?.year === peakYear.year;
              return (
                <rect
                  x={p.x ?? 0}
                  y={p.y ?? 0}
                  width={p.width ?? 0}
                  height={p.height ?? 0}
                  fill={isPeak ? 'url(#colorCountPeak)' : 'url(#colorCount)'}
                  rx={6}
                  ry={6}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* 인사이트 메시지 */}
      <div className='text-center text-sm text-muted-foreground'>
        {currentYear.year === peakYear.year ? (
          <p>
            <span className='font-semibold text-chart-3'>
              {currentYear.year}년
            </span>
            이 역대 최고 기록이에요!
          </p>
        ) : (
          <p>
            <span className='font-semibold text-chart-3'>
              {peakYear.year}년
            </span>
            이 최고 기록이에요. ({peakYear.count}권)
          </p>
        )}
        {previousYear && growthRate !== 0 && (
          <p className='text-xs text-muted-foreground'>
            전년 대비{' '}
            <span
              className={growthRate > 0 ? 'text-chart-3' : 'text-destructive'}
            >
              {growthRate > 0 ? '+' : ''}
              {growthRate}%
            </span>
          </p>
        )}
      </div>
    </div>
  );
};
