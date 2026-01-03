'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { YearlyTrend } from '@/entities/book/types/stats';

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
      <div className='flex h-[300px] items-center justify-center text-gray-500'>
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
          <CartesianGrid strokeDasharray='3 3' />
          <XAxis dataKey='year' />
          <YAxis />
          <Tooltip
            formatter={(value: number) => [`${value}권`, '독서량']}
            labelFormatter={(label) => `${label}년`}
          />
          <Legend />
          <Bar
            dataKey='count'
            fill='#10B981'
            name='독서량'
            radius={[8, 8, 0, 0]}
            // 최고 기록 연도는 진한 색상으로 표시
            shape={(props: unknown) => {
              const p = props as { x?: number; y?: number; width?: number; height?: number; payload?: { year: number } };
              const isPeak = p.payload?.year === peakYear.year;
              return (
                <rect
                  x={p.x ?? 0}
                  y={p.y ?? 0}
                  width={p.width ?? 0}
                  height={p.height ?? 0}
                  fill={isPeak ? '#059669' : '#10B981'}
                  rx={8}
                  ry={8}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* 인사이트 메시지 */}
      <div className='text-center text-sm text-gray-600'>
        {currentYear.year === peakYear.year ? (
          <p>
            <span className='font-semibold text-emerald-600'>
              {currentYear.year}년
            </span>
            이 역대 최고 기록이에요! 🎉
          </p>
        ) : (
          <p>
            <span className='font-semibold text-emerald-600'>
              {peakYear.year}년
            </span>
            이 최고 기록이에요. ({peakYear.count}권)
          </p>
        )}
        {previousYear && growthRate !== 0 && (
          <p className='text-xs text-gray-500'>
            전년 대비{' '}
            <span
              className={growthRate > 0 ? 'text-emerald-600' : 'text-red-600'}
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
