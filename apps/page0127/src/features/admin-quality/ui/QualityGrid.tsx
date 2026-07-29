import {
  METRIC_ORDER,
  METRICS,
  PAGE_PALETTE,
  seriesDelta,
} from '../lib/metrics';

import type {
  Dir,
  FormFactor,
  MetricKey,
  TrendPayload,
} from '../lib/metrics';
import type { Verdict } from '../lib/verdict';

// 방향 색 — 개선=초록, 악화=빨강, 변화없음=회색. (판정 색과 별개.)
const DIR_COLOR: Record<Dir, string> = {
  up: '#0ca30c',
  down: '#d03b3b',
  flat: '#898781',
};
const DIR_TEXT: Record<Dir, string> = {
  up: 'text-emerald-700',
  down: 'text-red-600',
  flat: 'text-text-subtle',
};
const ARROW: Record<Dir, string> = { up: '▲', down: '▼', flat: '→' };
const VERDICT_COLOR: Record<Verdict, string> = {
  pass: '#0ca30c',
  warn: '#fab219',
  fail: '#d03b3b',
  neutral: '#898781',
};

// 값 배열 → 미니 추세선. null은 건너뛰되 x는 원래 인덱스 유지(간격이 벌어져 보임).
const Sparkline = ({
  values,
  stroke,
}: {
  values: (number | null)[];
  stroke: string;
}) => {
  const w = 76;
  const h = 28;
  const pad = 3;
  const pts = values
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => p.v != null);
  if (pts.length === 0) return <span className='text-text-subtle'>–</span>;

  const vals = pts.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const n = values.length;
  const xAt = (i: number) => pad + (n > 1 ? i / (n - 1) : 0.5) * (w - 2 * pad);
  const yAt = (v: number) => h - pad - ((v - min) / range) * (h - 2 * pad);
  const line = pts
    .map((p) => `${xAt(p.i).toFixed(1)},${yAt(p.v).toFixed(1)}`)
    .join(' ');
  const last = pts[pts.length - 1];

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden='true'>
      <polyline
        points={line}
        fill='none'
        stroke={stroke}
        strokeWidth={1.7}
        strokeLinejoin='round'
        strokeLinecap='round'
        opacity={0.9}
      />
      <circle
        cx={xAt(last.i)}
        cy={yAt(last.v)}
        r={3}
        fill={stroke}
        stroke='#ffffff'
        strokeWidth={2}
      />
    </svg>
  );
};

const GridTable = ({
  ff,
  payload,
}: {
  ff: FormFactor;
  payload: TrendPayload;
}) => {
  // page → (metric → values) 로 정리.
  const byPage: Record<string, Partial<Record<MetricKey, (number | null)[]>>> =
    {};
  METRIC_ORDER.forEach((mk) => {
    payload[ff][mk].forEach((s) => {
      (byPage[s.page] ??= {})[mk] = s.values;
    });
  });
  const pages = payload.pages.filter((p) => byPage[p]);

  if (pages.length === 0) {
    return (
      <p className='rounded-lg border border-line p-4 text-sm text-text-subtle'>
        {ff === 'desktop' ? '데스크탑' : '모바일'} 측정 데이터가 아직 없습니다.
      </p>
    );
  }

  return (
    <div className='rounded-lg border border-line'>
      <div className='overflow-x-auto'>
        <table className='w-full min-w-[560px] text-sm'>
          <thead className='text-text-subtle'>
            <tr className='border-b border-line text-left'>
              <th className='py-2.5 pl-4 pr-4 font-medium'>페이지</th>
              {METRIC_ORDER.map((mk) => (
                <th key={mk} className='py-2.5 pr-4 font-medium'>
                  {METRICS[mk].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => {
              const color =
                PAGE_PALETTE[payload.pages.indexOf(page) % PAGE_PALETTE.length];
              return (
                <tr key={page} className='border-b border-line/60 last:border-0'>
                  <td className='py-2.5 pl-4 pr-4'>
                    <span className='flex items-center gap-2 font-medium'>
                      <span
                        className='inline-block h-2 w-2 flex-none rounded-full'
                        style={{ background: color }}
                      />
                      {page}
                    </span>
                  </td>
                  {METRIC_ORDER.map((mk) => {
                    const def = METRICS[mk];
                    const values = byPage[page][mk] ?? [];
                    const { last, delta, dir } = seriesDelta(
                      values,
                      def.lowerIsBetter,
                    );
                    return (
                      <td key={mk} className='py-2.5 pr-4'>
                        <div className='flex items-center gap-3'>
                          <Sparkline values={values} stroke={DIR_COLOR[dir]} />
                          <div className='flex flex-col'>
                            <span
                              className={
                                def.verdict
                                  ? 'flex items-center gap-1 font-medium tabular-nums'
                                  : 'font-medium tabular-nums text-text-subtle'
                              }
                            >
                              {def.verdict && last != null && (
                                <span
                                  className='inline-block h-[7px] w-[7px] rounded-full'
                                  style={{
                                    background:
                                      VERDICT_COLOR[def.verdict(last)],
                                  }}
                                />
                              )}
                              {last == null ? '–' : def.format(last)}
                            </span>
                            <span
                              className={`text-xs font-medium tabular-nums ${DIR_TEXT[dir]}`}
                            >
                              {delta == null
                                ? ''
                                : dir === 'flat'
                                  ? '변화 없음'
                                  : `${ARROW[dir]} ${def.formatDelta(delta)}`}
                            </span>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const QualityGrid = ({ data }: { data: TrendPayload }) => {
  return (
    <section className='space-y-3'>
      <div>
        <h2 className='text-sm font-medium'>한눈에 — 페이지별 지표</h2>
        <p className='mt-0.5 text-xs text-text-subtle'>
          선 색: <span className='text-emerald-700'>초록=개선</span> ·{' '}
          <span className='text-red-600'>빨강=악화</span>. 점 색은 판정(양호/주의/위험).
        </p>
      </div>

      <div className='space-y-1.5'>
        <p className='px-1 text-xs text-text-subtle'>
          모바일 <span className='text-text-subtle/70'>· 느린 4G · CPU 4× 스로틀</span>
        </p>
        <GridTable ff='mobile' payload={data} />
      </div>

      <div className='space-y-1.5 pt-1'>
        <p className='px-1 text-xs text-text-subtle'>
          데스크탑{' '}
          <span className='text-text-subtle/70'>· 빠른 4G · 스로틀 없음</span>
        </p>
        <GridTable ff='desktop' payload={data} />
      </div>
    </section>
  );
};
