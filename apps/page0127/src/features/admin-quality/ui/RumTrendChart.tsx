'use client';

import { RUM_THRESHOLDS } from '@repo/quality/rum';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { chartInk } from '@/shared/lib/chartStyles';

import type { RumWindow } from '../api/getQualityDashboard';

/**
 * 자체 RUM의 일별 p75 추세.
 *
 * CrUX 추세(FieldTrendChart)와 **다른 차트로 둔다.** CrUX는 28일 이동창 값이라 하루치
 * 변화가 1/28로 희석돼 나타나고, 여기는 그날 방문만으로 계산한 값이라 훨씬 민감하다.
 * 한 차트에 겹쳐 그리면 같은 이름의 서로 다른 숫자를 비교하게 된다.
 */

const formatMs = (value: number): string =>
  value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;

export const RumTrendChart = ({ rum }: { rum: RumWindow | null }) => {
  if (!rum) {
    return (
      <p className='rounded-lg border border-line p-4 text-sm text-text-faint'>
        자체 RUM 조회에 실패했습니다. (데이터가 없는 것과는 다른 상태입니다 —
        서버 로그를 확인하세요.)
      </p>
    );
  }

  if (rum.trend.length === 0) {
    return (
      <p className='rounded-lg border border-line p-4 text-sm text-text-faint'>
        자체 RUM 샘플이 아직 없습니다. 배포 후 실제 방문이 발생하면 채워집니다.
      </p>
    );
  }

  const label = rum.trendMetric.toUpperCase();
  const [goodThreshold] = RUM_THRESHOLDS[rum.trendMetric];
  const data = rum.trend.map((point) => ({
    day: point.day.slice(5),
    p75: point.p75,
    count: point.count,
  }));

  return (
    <section className='rounded-lg border border-line p-4'>
      <div className='mb-1 flex items-baseline justify-between gap-2'>
        <h2 className='text-sm font-medium'>
          자체 RUM — {label} 일별 p75 (실사용자)
        </h2>
        <span className='text-xs text-text-faint'>최근 {rum.windowDays}일</span>
      </div>
      <p className='mb-3 text-xs text-text-faint'>
        점선은 CWV 양호 기준({formatMs(goodThreshold)}). 표본이 없는 날은 점을
        찍지 않고 선도 잇지 않는다 — 값 0이 아니라 &quot;그날 방문이
        없었음&quot;이다.
      </p>
      <ResponsiveContainer width='100%' height={220}>
        <LineChart data={data}>
          <CartesianGrid stroke={chartInk.grid} strokeDasharray='3 3' />
          <XAxis dataKey='day' tick={{ fill: chartInk.axis, fontSize: 11 }} />
          <YAxis
            tick={{ fill: chartInk.axis, fontSize: 11 }}
            tickFormatter={formatMs}
          />
          <Tooltip
            // recharts 3의 formatter는 value를 넓은 유니온으로 준다 — 여기서 좁힌다.
            // 표본 수를 함께 띄우는 게 핵심이다: p75만 보면 n=2인 날의 튐을
            // 실제 악화로 오해한다.
            formatter={(value, _name, item) => {
              const ms = typeof value === 'number' ? value : Number(value);
              const count = (item?.payload as { count?: number } | undefined)
                ?.count;
              return [
                count ? `${formatMs(ms)} (n=${count})` : formatMs(ms),
                `${label} p75`,
              ];
            }}
          />
          <ReferenceLine
            y={goodThreshold}
            stroke={chartInk.axis}
            strokeDasharray='4 4'
          />
          <Line
            type='monotone'
            dataKey='p75'
            stroke={chartInk.primary}
            connectNulls={false}
            dot
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
};
