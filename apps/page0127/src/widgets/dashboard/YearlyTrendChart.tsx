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

import { chartInk, chartTooltipStyle } from '@/shared/lib/chartStyles';

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
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id='ytGreen' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0%' stopColor={chartInk.primaryGradientTop} />
              <stop offset='100%' stopColor={chartInk.primaryGradientBottom} />
            </linearGradient>
            <linearGradient id='ytGreenMuted' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0%' stopColor={chartInk.primaryGradientBottom} />
              <stop offset='100%' stopColor='#dcfce7' />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray='3 3'
            vertical={false}
            stroke={chartInk.grid}
          />
          <XAxis
            dataKey='year'
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartInk.axis, fontSize: 12 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartInk.axis, fontSize: 12 }}
            allowDecimals={false}
            width={36}
          />
          <Tooltip
            cursor={{ fill: chartInk.cursor }}
            contentStyle={chartTooltipStyle}
            formatter={(value) => [`${value}권`, '독서량']}
            labelFormatter={(label) => `${label}년`}
          />
          {/* 그린 그라데이션 — 최고 기록 연도는 진한 그라데이션, 나머지는 옅게 */}
          <Bar
            dataKey='count'
            name='독서량'
            radius={[8, 8, 0, 0]}
            barSize={40}
            // Recharts 애니메이션(react-smooth)이 React 19에서 완료되지 못하고
            // 리렌더를 과도하게 발생시킨다(Day 67 측정으로 확인) → 비활성화
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell
                key={entry.year}
                fill={
                  entry.year === peakYear.year
                    ? 'url(#ytGreen)'
                    : 'url(#ytGreenMuted)'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* 인사이트 메시지 — 텍스트는 잉크로, 강조는 딥그린(성취) 한 곳만 */}
      <div className='text-center text-sm text-text-subtle'>
        {currentYear.year === peakYear.year ? (
          <p>
            <span className='font-semibold text-primary'>
              {currentYear.year}년
            </span>
            이 역대 최고 기록이에요
          </p>
        ) : (
          <p>
            <span className='font-semibold text-primary'>
              {peakYear.year}년
            </span>
            이 최고 기록이에요 ({peakYear.count}권)
          </p>
        )}
        {previousYear && growthRate !== 0 && (
          <p className='mt-0.5 text-xs text-text-faint'>
            전년 대비{' '}
            <span
              className={
                growthRate > 0
                  ? 'font-medium text-primary'
                  : 'font-medium text-destructive'
              }
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
