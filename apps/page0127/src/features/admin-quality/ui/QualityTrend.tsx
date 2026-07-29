'use client';

import { useMemo, useRef, useState } from 'react';

import { METRIC_ORDER, METRICS, PAGE_PALETTE } from '../lib/metrics';

import type { FormFactor, MetricKey, TrendPayload } from '../lib/metrics';

// viewBox 좌표계(가로 넓은 3:1). 실제 표시 폭은 CSS가 100%로 늘린다.
const CH = { w: 900, h: 300, l: 46, r: 66, t: 16, b: 30 };

// 축 눈금을 깔끔한 수로 나눈다(0/1000/2000 식).
const niceTicks = (min: number, max: number) => {
  const span = max - min || 1;
  const step = Math.pow(10, Math.floor(Math.log10(span / 4)));
  const err = span / 4 / step;
  const mult = err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
  const s = mult * step;
  const lo = Math.floor(min / s) * s;
  const hi = Math.ceil(max / s) * s;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += s) ticks.push(+v.toFixed(6));
  return { lo, hi, ticks };
};

const colorOf = (pages: string[], page: string) =>
  PAGE_PALETTE[pages.indexOf(page) % PAGE_PALETTE.length];

// 마지막 유효값(null 아님)의 인덱스. 없으면 -1. (reduce는 오버로드상 number|null로 추론돼 안 씀.)
const lastIndex = (vals: (number | null)[]): number => {
  let idx = -1;
  for (let i = 0; i < vals.length; i++) if (vals[i] != null) idx = i;
  return idx;
};

const Panel = ({
  ff,
  label,
  cond,
  metric,
  data,
  hidden,
}: {
  ff: FormFactor;
  label: string;
  cond: string;
  metric: MetricKey;
  data: TrendPayload;
  hidden: Set<string>;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ idx: number; left: number } | null>(
    null
  );
  const def = METRICS[metric];
  const { weeks, pages } = data;

  // 페이지 → 값 배열. 값이 전부 null인(측정 없는) 페이지는 제외.
  const byPage = useMemo(() => {
    const m = new Map<string, (number | null)[]>();
    for (const s of data[ff][metric]) {
      if (s.values.some((v) => v != null)) m.set(s.page, s.values);
    }
    return m;
  }, [data, ff, metric]);

  const visible = pages.filter((p) => byPage.has(p) && !hidden.has(p));

  const plotW = CH.w - CH.l - CH.r;
  const plotH = CH.h - CH.t - CH.b;
  const xAt = (i: number) =>
    CH.l + (weeks.length > 1 ? i / (weeks.length - 1) : 0.5) * plotW;

  if (byPage.size === 0) {
    return (
      <PanelShell label={label} cond={cond}>
        <p className='px-2 py-10 text-center text-sm text-text-faint'>
          {label} 측정 데이터가 아직 없습니다.
        </p>
      </PanelShell>
    );
  }

  const allVals = visible.flatMap((p) =>
    (byPage.get(p) ?? []).filter((v): v is number => v != null)
  );
  const { lo, hi, ticks } = niceTicks(
    allVals.length ? Math.min(...allVals) : 0,
    allVals.length ? Math.max(...allVals) : 1
  );
  const yAt = (v: number) => CH.t + (1 - (v - lo) / (hi - lo || 1)) * plotH;

  // 끝점 라벨 세로 겹침 방지
  const ends = visible
    .map((p) => {
      const vals = byPage.get(p)!;
      const lastIdx = lastIndex(vals);
      return { page: p, y: yAt(vals[lastIdx] as number) };
    })
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) {
    if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
  }

  const onMove = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * CH.w;
    let idx = 0;
    let bd = Infinity;
    weeks.forEach((_, i) => {
      const dd = Math.abs(xAt(i) - relX);
      if (dd < bd) {
        bd = dd;
        idx = i;
      }
    });
    setHover({ idx, left: (xAt(idx) / CH.w) * rect.width });
  };

  const tooltipRows =
    hover &&
    visible
      .map((p) => ({ page: p, v: byPage.get(p)![hover.idx] }))
      .filter((r): r is { page: string; v: number } => r.v != null)
      .sort((a, b) => (def.lowerIsBetter ? a.v - b.v : b.v - a.v));

  return (
    <PanelShell label={label} cond={cond}>
      <div className='relative'>
        <svg
          ref={svgRef}
          className='block h-auto w-full'
          viewBox={`0 0 ${CH.w} ${CH.h}`}
          preserveAspectRatio='xMidYMid meet'
          role='img'
          aria-label={`${label} 페이지별 추세`}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {/* 가로 그리드 + y 눈금 */}
          {ticks.map((v) => (
            <g key={v}>
              <line
                x1={CH.l}
                y1={yAt(v)}
                x2={CH.w - CH.r}
                y2={yAt(v)}
                stroke='#e1e0d9'
                strokeWidth={1}
              />
              <text
                x={CH.l - 7}
                y={yAt(v)}
                dy='0.32em'
                textAnchor='end'
                fontSize={10}
                fill='#898781'
                className='tabular-nums'
              >
                {def.format(v).replace('KB', '')}
              </text>
            </g>
          ))}
          {/* x 라벨 */}
          {weeks.map((w, i) => (
            <text
              key={i}
              x={xAt(i)}
              y={CH.h - 11}
              textAnchor='middle'
              fontSize={10}
              fill='#898781'
            >
              {w}
            </text>
          ))}
          {/* 페이지 선 + 끝점 */}
          {visible.map((p) => {
            const vals = byPage.get(p)!;
            const pts = vals
              .map((v, i) =>
                v == null ? null : `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`
              )
              .filter((s): s is string => s != null)
              .join(' ');
            const lastIdx = lastIndex(vals);
            return (
              <g key={p}>
                <polyline
                  points={pts}
                  fill='none'
                  stroke={colorOf(pages, p)}
                  strokeWidth={2}
                  strokeLinejoin='round'
                  strokeLinecap='round'
                />
                <circle
                  cx={xAt(lastIdx)}
                  cy={yAt(vals[lastIdx] as number)}
                  r={3.3}
                  fill={colorOf(pages, p)}
                  stroke='#ffffff'
                  strokeWidth={2}
                />
              </g>
            );
          })}
          {/* 끝점 라벨 */}
          {ends.map((e) => (
            <text
              key={e.page}
              x={CH.w - CH.r + 7}
              y={e.y}
              dy='0.32em'
              fontSize={10.5}
              fontWeight={600}
              fill={colorOf(pages, e.page)}
            >
              {e.page}
            </text>
          ))}
          {/* 호버 크로스헤어 */}
          {hover && (
            <line
              x1={xAt(hover.idx)}
              y1={CH.t}
              x2={xAt(hover.idx)}
              y2={CH.h - CH.b}
              stroke='#c3c2b7'
              strokeWidth={1}
              strokeDasharray='3 3'
            />
          )}
          {visible.length === 0 && (
            <text
              x={CH.w / 2}
              y={CH.h / 2}
              textAnchor='middle'
              fontSize={13}
              fill='#898781'
            >
              표시할 페이지를 켜주세요
            </text>
          )}
        </svg>

        {/* 툴팁 */}
        {hover && tooltipRows && tooltipRows.length > 0 && (
          <div
            className='pointer-events-none absolute top-1.5 z-10 min-w-[116px] rounded-lg bg-gray-900 px-2.5 py-2 text-xs text-white shadow-lg'
            style={{
              left: `min(calc(100% - 128px), max(0px, ${hover.left + 10}px))`,
            }}
          >
            <div className='mb-1 text-xs font-bold opacity-80'>
              {weeks[hover.idx]}
            </div>
            {tooltipRows.map((r) => (
              <div
                key={r.page}
                className='flex items-center justify-between gap-2.5 py-px'
              >
                <span className='inline-flex items-center'>
                  <span
                    className='mr-1.5 inline-block h-2 w-2 rounded-full'
                    style={{ background: colorOf(pages, r.page) }}
                  />
                  {r.page}
                </span>
                <b className='font-medium tabular-nums'>{def.format(r.v)}</b>
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelShell>
  );
};

const PanelShell = ({
  label,
  cond,
  children,
}: {
  label: string;
  cond: string;
  children: React.ReactNode;
}) => (
  <div className='rounded-lg border border-line p-3'>
    <div className='mb-1 flex items-baseline gap-2 px-1'>
      <span className='text-sm font-medium'>{label}</span>
      <span className='text-xs text-text-faint'>{cond}</span>
    </div>
    {children}
  </div>
);

export const QualityTrend = ({ data }: { data: TrendPayload }) => {
  const [metric, setMetric] = useState<MetricKey>('perf');
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const toggle = (p: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  return (
    <section className='space-y-3'>
      <div>
        <h2 className='text-sm font-medium'>추세 자세히 — 지표별</h2>
        <p className='mt-0.5 text-xs text-text-faint'>
          전체 기간 연속선. 페이지 칩으로 선을 껐다 켜고, 선 위에 마우스를
          올리면 그 주 값이 나옵니다.
        </p>
      </div>

      {/* 지표 탭 */}
      <div className='flex flex-wrap gap-1' role='group' aria-label='지표 선택'>
        {METRIC_ORDER.map((mk) => (
          <button
            key={mk}
            type='button'
            aria-pressed={mk === metric}
            onClick={() => setMetric(mk)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              mk === metric
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-line bg-white text-text-faint hover:bg-gray-50'
            }`}
          >
            {METRICS[mk].label}
          </button>
        ))}
      </div>

      {/* 페이지 토글 칩 */}
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-xs text-text-faint'>페이지</span>
        {data.pages.map((p) => {
          const on = !hidden.has(p);
          const color = colorOf(data.pages, p);
          return (
            <button
              key={p}
              type='button'
              aria-pressed={on}
              onClick={() => toggle(p)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium transition ${
                on
                  ? 'border-line bg-white text-gray-900'
                  : 'border-line/60 bg-transparent text-text-faint'
              }`}
            >
              <span
                className='inline-block h-2.5 w-2.5 rounded-full'
                style={{ background: on ? color : '#c3c2b7' }}
              />
              <span className={on ? '' : 'line-through decoration-gray-300'}>
                {p}
              </span>
            </button>
          );
        })}
      </div>

      {/* 모바일 · 데스크탑 세로 스택 */}
      <div className='space-y-3'>
        <Panel
          ff='mobile'
          label='모바일'
          cond='느린 4G · CPU 4× 스로틀'
          metric={metric}
          data={data}
          hidden={hidden}
        />
        <Panel
          ff='desktop'
          label='데스크탑'
          cond='빠른 4G · 스로틀 없음'
          metric={metric}
          data={data}
          hidden={hidden}
        />
      </div>
    </section>
  );
};
