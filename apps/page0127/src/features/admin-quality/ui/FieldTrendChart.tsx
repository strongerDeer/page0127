'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { chartInk } from '@/shared/lib/chartStyles';

import type { FieldHistoryRow } from '../api/getQualityDashboard';

// metric='lcp'의 good 비율(0~1)을 주 단위로. 값 없는 주는 점만(선 안 이음).
export function FieldTrendChart({ rows }: { rows: FieldHistoryRow[] }) {
  const data = rows
    .filter((r) => r.metric === 'lcp')
    .map((r) => ({ week: r.period_end.slice(5), good: r.good }));

  if (data.length === 0) {
    return (
      <p className='rounded-lg border border-line p-4 text-sm text-text-faint'>
        CrUX 추세 데이터가 아직 없습니다.
      </p>
    );
  }

  return (
    <section className='rounded-lg border border-line p-4'>
      <h2 className='mb-3 text-sm font-semibold'>LCP 양호(good) 비율 추세</h2>
      <ResponsiveContainer width='100%' height={220}>
        <LineChart data={data}>
          <CartesianGrid stroke={chartInk.grid} strokeDasharray='3 3' />
          <XAxis dataKey='week' tick={{ fill: chartInk.axis, fontSize: 11 }} />
          <YAxis domain={[0, 1]} tick={{ fill: chartInk.axis, fontSize: 11 }} />
          <Tooltip />
          <Line
            type='monotone'
            dataKey='good'
            stroke={chartInk.primary}
            connectNulls={false}
            dot
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
