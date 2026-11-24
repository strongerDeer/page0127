import { formatChartValue } from '../model/chartBlock';

import type { SeriesChart, SingleChart } from '../model/chartBlock';

/**
 * 본문 차트 블록 그리기 — 서버·브라우저(어드민 미리보기) 어디서든 그려지도록 훅을 쓰지 않는다.
 *
 * 차트 라이브러리를 쓰지 않는 이유: 숫자 몇 개짜리 막대라 CSS 너비·SVG 몇 줄이면 충분하고,
 * 공개 글은 정적 페이지(ISR)라 그림이 HTML 에 그대로 들어가야 검색엔진·느린 폰에서도 보인다.
 * (recharts 는 브라우저 JS 가 돌아야 그려진다 — 프로필 페이지에서 무게로 문제가 됐다)
 *
 * 색: 진한 막대는 primary, 나머지는 옅은 잉크. 민트는 출처 앞 점에만(큰 면 금지 규칙).
 */

const Figure = ({
  title,
  note,
  source,
  tinted = false,
  children,
}: {
  title: string;
  note: string;
  source: string;
  tinted?: boolean;
  children: React.ReactNode;
}) => (
  <figure
    className={`mt-8 flex flex-col gap-4 rounded-2xl border p-5 ${tinted ? 'tint-cool border-line-soft' : 'border-line bg-card'}`}
  >
    {title && (
      <p className='text-[15px] font-semibold break-keep text-text-strong'>
        {title}
      </p>
    )}
    {children}
    {(note || source) && (
      <figcaption className='flex flex-col gap-0.5 text-xs leading-relaxed break-keep text-text-subtle'>
        {note && <span>{note}</span>}
        {source && (
          <span className='flex items-start gap-1.5'>
            <span
              aria-hidden
              className='mt-[7px] inline-block size-1.5 shrink-0 rounded-full bg-mint'
            />
            {source}
          </span>
        )}
      </figcaption>
    )}
  </figure>
);

/** 사람 한 명 — 머리 + 몸. 채운 비율만큼 진하게(SVG 안의 SVG 는 자기 너비로 잘린다 → id 없이 부분 채우기) */
const PERSON = 'M30 8a14 14 0 1 1 -0.01 0Z M8 98V62a22 22 0 0 1 44 0v36Z';

const Person = ({ fill }: { fill: number }) => (
  <svg viewBox='0 0 60 100' aria-hidden className='h-auto w-full'>
    <path d={PERSON} className='fill-text-subtle/25' />
    {fill > 0 && (
      <svg width={60 * fill} height={100} viewBox={`0 0 ${60 * fill} 100`}>
        <path d={PERSON} className='fill-primary' />
      </svg>
    )}
  </svg>
);

const BigNumber = ({ value, unit }: { value: number; unit: string }) => (
  <span className='text-5xl leading-none font-bold tabular-nums text-text-strong'>
    {formatChartValue(value)}
    <span className='ml-0.5 text-2xl'>{unit}</span>
  </span>
);

export const SingleStatChart = ({ spec }: { spec: SingleChart }) => {
  const people = spec.value / 10;
  return (
    <Figure title={spec.title} note={spec.note} source={spec.source} tinted>
      <div className='flex flex-wrap items-baseline gap-3'>
        <BigNumber value={spec.value} unit={spec.unit} />
        {spec.label && spec.label !== spec.title && (
          <span className='text-sm break-keep text-text-subtle'>
            {spec.label}
          </span>
        )}
      </div>
      {spec.type === 'people' && (
        <div
          role='img'
          aria-label={`10명 중 ${formatChartValue(people)}명`}
          className='grid max-w-[420px] grid-cols-10 gap-1.5'
        >
          {Array.from({ length: 10 }, (_, index) => (
            <Person
              key={index}
              fill={Math.max(0, Math.min(1, people - index))}
            />
          ))}
        </div>
      )}
    </Figure>
  );
};

/** 진하게 칠할지 — highlight 가 있으면 그 항목만, 없으면 bar 는 전부·column 은 마지막 */
const isStrong = (spec: SeriesChart, label: string, index: number) => {
  if (spec.highlight) return spec.highlight === label;
  return spec.type === 'bar' || index === spec.items.length - 1;
};

const valueText = (value: number, unit: string) =>
  `${formatChartValue(value)}${unit}`;

export const BarChart = ({ spec }: { spec: SeriesChart }) => (
  <Figure
    title={spec.title}
    note={spec.note || `막대 끝 = ${valueText(spec.max, spec.unit)}`}
    source={spec.source}
  >
    <ul className='flex flex-col gap-3.5'>
      {spec.items.map((item, index) => (
        <li
          key={item.label}
          title={`${item.label} ${valueText(item.value, spec.unit)}`}
          className='grid grid-cols-[5.5rem_1fr_3.75rem] items-center gap-3 text-sm'
        >
          <span className='break-keep text-text-body'>{item.label}</span>
          <span className='h-3 overflow-hidden rounded-full bg-muted'>
            <span
              className={`block h-full rounded-full ${isStrong(spec, item.label, index) ? 'bg-primary' : 'bg-text-subtle/35'}`}
              style={{ width: `${(item.value / spec.max) * 100}%` }}
            />
          </span>
          <span className='text-right font-semibold tabular-nums text-text-strong'>
            {valueText(item.value, spec.unit)}
          </span>
        </li>
      ))}
    </ul>
  </Figure>
);

const COLUMN_HEIGHT = 160;

export const ColumnChart = ({ spec }: { spec: SeriesChart }) => (
  <Figure title={spec.title} note={spec.note} source={spec.source}>
    {/* 막대가 적으면 가운데, 많으면 가로 스크롤 — w-max+mx-auto 라 넘칠 때 왼쪽이 잘리지 않는다 */}
    <div className='overflow-x-auto'>
      <div className='mx-auto w-max'>
        <ul
          className='flex items-end gap-6 border-b border-line px-4 sm:gap-9 sm:px-6'
          style={{ height: COLUMN_HEIGHT + 40 }}
        >
          {spec.items.map((item, index) => (
            <li
              key={item.label}
              title={`${item.label} ${valueText(item.value, spec.unit)}`}
              className='flex w-16 shrink-0 flex-col items-center justify-end gap-1.5'
            >
              <span className='text-sm font-semibold tabular-nums text-text-strong'>
                {valueText(item.value, spec.unit)}
              </span>
              <span
                className={`block w-10 rounded-t ${isStrong(spec, item.label, index) ? 'bg-primary' : 'bg-text-subtle/35'}`}
                style={{ height: (item.value / spec.max) * COLUMN_HEIGHT }}
              />
            </li>
          ))}
        </ul>
        <ul className='flex gap-6 px-4 pt-2 sm:gap-9 sm:px-6'>
          {spec.items.map((item) => (
            <li
              key={item.label}
              className='w-16 shrink-0 text-center text-xs text-text-subtle'
            >
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </Figure>
);

export const SlopeChart = ({ spec }: { spec: SeriesChart }) => {
  const [from, to] = spec.items;
  // 위 20 ~ 아래 170 사이에 값을 놓는다 (0 이 바닥)
  const y = (value: number) => 170 - (value / spec.max) * 150;
  return (
    <Figure title={spec.title} note={spec.note} source={spec.source}>
      <svg
        viewBox='0 0 520 200'
        role='img'
        aria-label={`${from.label} ${valueText(from.value, spec.unit)}에서 ${to.label} ${valueText(to.value, spec.unit)}`}
        className='mx-auto h-auto w-full max-w-[520px]'
      >
        <line x1='100' y1='20' x2='100' y2='170' className='stroke-line' />
        <line x1='420' y1='20' x2='420' y2='170' className='stroke-line' />
        <line
          x1='100'
          y1={y(from.value)}
          x2='420'
          y2={y(to.value)}
          strokeWidth='2'
          className='stroke-primary'
        />
        {[
          { item: from, x: 100, anchor: 'end' as const, dx: -16 },
          { item: to, x: 420, anchor: 'start' as const, dx: 16 },
        ].map(({ item, x, anchor, dx }) => (
          <g key={item.label}>
            <circle
              cx={x}
              cy={y(item.value)}
              r='7'
              strokeWidth='2'
              className='fill-primary stroke-card'
            />
            <text
              x={x + dx}
              y={y(item.value) + 5}
              textAnchor={anchor}
              fontSize='16'
              fontWeight='700'
              className='fill-text-strong'
            >
              {valueText(item.value, spec.unit)}
            </text>
            <text
              x={x}
              y='192'
              textAnchor='middle'
              fontSize='13'
              className='fill-text-subtle'
            >
              {item.label}
            </text>
          </g>
        ))}
      </svg>
    </Figure>
  );
};

/** 틀린 블록 — 어드민 미리보기에서만 보인다 */
export const ChartError = ({ message }: { message: string }) => (
  <p className='mt-6 rounded-md border border-dashed border-destructive/50 p-3 text-sm text-destructive'>
    차트를 그리지 못했어요: {message}
  </p>
);
