import { formatChartValue } from '../model/chartBlock';

import type {
  AgeTableChart as AgeTableSpec,
  SeriesChart,
  ShelfChart,
  ShelfGroup,
  SingleChart,
} from '../model/chartBlock';

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

const Person = ({
  fill,
  tone = 'fill-primary',
}: {
  fill: number;
  /** 채운 색 — 나이별 표에서는 막대(primary)와 헷갈리지 않게 진한 잉크 */
  tone?: string;
}) => (
  <svg viewBox='0 0 60 100' aria-hidden className='h-auto w-full'>
    <path d={PERSON} className='fill-text-subtle/25' />
    {fill > 0 && (
      <svg width={60 * fill} height={100} viewBox={`0 0 ${60 * fill} 100`}>
        <path d={PERSON} className={tone} />
      </svg>
    )}
  </svg>
);

/** 100 명 기준 비율 → 사람 10명 (한 명 = 10%) */
const TenPeople = ({
  rate,
  tone,
  className,
}: {
  rate: number;
  tone?: string;
  className: string;
}) => (
  <div
    role='img'
    aria-label={`10명 중 ${formatChartValue(rate / 10)}명`}
    className={`grid grid-cols-10 ${className}`}
  >
    {Array.from({ length: 10 }, (_, index) => (
      <Person
        key={index}
        tone={tone}
        fill={Math.max(0, Math.min(1, rate / 10 - index))}
      />
    ))}
  </div>
);

const BigNumber = ({ value, unit }: { value: number; unit: string }) => (
  <span className='text-5xl leading-none font-bold tabular-nums text-text-strong'>
    {formatChartValue(value)}
    <span className='ml-0.5 text-2xl'>{unit}</span>
  </span>
);

export const SingleStatChart = ({ spec }: { spec: SingleChart }) => {
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
        <TenPeople rate={spec.value} className='max-w-[420px] gap-1.5' />
      )}
    </Figure>
  );
};

/** 진하게 칠할지 — highlight 가 있으면 그 항목만, 없으면 bar 는 전부·column 은 마지막 */
const isStrong = (spec: SeriesChart, label: string, index: number) => {
  if (spec.highlight) return spec.highlight === label;
  return spec.type === 'bar' || index === spec.items.length - 1;
};

/** 항목 중 하나라도 소수면 모두 소수 한 자리로 (55 → 55.0) */
const valueText = (spec: SeriesChart, value: number) =>
  `${formatChartValue(
    value,
    spec.items.some((item) => !Number.isInteger(item.value))
  )}${spec.unit}`;

export const BarChart = ({ spec }: { spec: SeriesChart }) => (
  <Figure
    title={spec.title}
    note={spec.note || `막대 끝 = ${formatChartValue(spec.max)}${spec.unit}`}
    source={spec.source}
  >
    <ul className='flex flex-col gap-3.5'>
      {spec.items.map((item, index) => (
        <li
          key={item.label}
          title={`${item.label} ${valueText(spec, item.value)}`}
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
            {valueText(spec, item.value)}
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
              title={`${item.label} ${valueText(spec, item.value)}`}
              className='flex w-16 shrink-0 flex-col items-center justify-end gap-1.5'
            >
              <span className='text-sm font-semibold tabular-nums text-text-strong'>
                {valueText(spec, item.value)}
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
        aria-label={`${from.label} ${valueText(spec, from.value)}에서 ${to.label} ${valueText(spec, to.value)}`}
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
              {valueText(spec, item.value)}
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

/* ───────────── 책장 비교 (shelf) ───────────── */

/** 책장 한 줄에 꽂는 책등 수 — 33권(학생 읽은 사람 평균)이 두 줄에 들어가는 개수 */
const SPINES_PER_ROW = 17;

/**
 * 책등 하나 = 1권.
 * fill: 파랗게 채운 비율(전체 평균), extra: 읽은 사람 평균까지 더해지는 칸이면 민트로 채운다.
 * 2.4권이면 세 번째 책등은 40% 파랑 + 60% 민트.
 *
 * 왜 점선이 아니라 민트인가: 점선 책등은 "안 읽은 책"처럼 보였다(HJ, 2026-11-25).
 * 더해지는 권수도 읽은 책이라 채운 책으로 그리고, 색으로만 나눈다 — 인스타 카드와 같은 표현.
 */
const Spine = ({ fill, extra }: { fill: number; extra: boolean }) => {
  const filled = extra ? 1 : fill;
  return (
    <svg viewBox='0 0 12 34' aria-hidden className='block h-auto w-full'>
      {extra && fill < 1 && (
        <rect width='12' height='34' rx='2' className='fill-mint' />
      )}
      {fill > 0 && (
        <rect
          width={12 * fill}
          height='34'
          rx={fill < 1 ? 1 : 2}
          className='fill-primary'
        />
      )}
      {filled > 0 && (
        // 책등 위쪽 띠 — 책처럼 보이게
        <rect
          x='2'
          y='6'
          width={Math.max(0, Math.min(8, 12 * filled - 2))}
          height='1.5'
          className='fill-card/70'
        />
      )}
    </svg>
  );
};

const Shelf = ({ group }: { group: ShelfGroup }) => {
  const slots = Math.ceil(Math.max(group.average, group.readers ?? 0));
  const readerSlots = group.readers === null ? 0 : Math.ceil(group.readers);
  const spines = Array.from({ length: slots }, (_, index) => ({
    fill: Math.max(0, Math.min(1, group.average - index)),
    extra: index < readerSlots,
  }));
  const rows = Array.from(
    { length: Math.ceil(spines.length / SPINES_PER_ROW) },
    (_, row) => spines.slice(row * SPINES_PER_ROW, (row + 1) * SPINES_PER_ROW)
  );
  return (
    <div
      role='img'
      aria-label={`전체 평균 ${formatChartValue(group.average)}권${group.readers === null ? '' : `, 읽은 사람 평균 ${formatChartValue(group.readers)}권`}`}
      className='flex flex-col gap-1'
    >
      {rows.map((row, index) => (
        // 17칸 격자 — 좁은 폰(320px)에서는 책등이 같이 줄어든다
        <div
          key={index}
          className='grid max-w-[252px] items-end gap-[3px] border-b-[3px] border-text-subtle/35 pt-2'
          style={{
            gridTemplateColumns: `repeat(${SPINES_PER_ROW}, minmax(0, 1fr))`,
          }}
        >
          {row.map((spine, column) => (
            <Spine key={column} fill={spine.fill} extra={spine.extra} />
          ))}
        </div>
      ))}
    </div>
  );
};

const GroupLabel = ({ children }: { children: React.ReactNode }) => (
  <p className='mt-4 mb-1.5 text-xs text-text-subtle first:mt-0'>{children}</p>
);

const MintBook = () => (
  <span
    aria-hidden
    className='inline-block h-3.5 w-2.5 shrink-0 rounded-[2px] bg-mint'
  />
);

export const ShelfCompareChart = ({ spec }: { spec: ShelfChart }) => (
  <Figure title={spec.title} note={spec.note} source={spec.source}>
    <div
      className={`grid gap-4 ${spec.groups.length > 1 ? 'sm:grid-cols-2' : ''}`}
    >
      {spec.groups.map((group) => (
        <div key={group.label} className='rounded-xl bg-muted p-4'>
          <p className='mb-4 text-[15px] font-bold break-keep text-text-strong'>
            {group.label}
            {group.sub && (
              <span className='ml-1.5 text-xs font-normal text-text-subtle'>
                {group.sub}
              </span>
            )}
          </p>

          <GroupLabel>10명 중 책을 읽은 사람</GroupLabel>
          <BigNumber value={group.rate} unit='%' />
          <TenPeople rate={group.rate} className='mt-3 max-w-[260px] gap-1' />

          <GroupLabel>1년에 읽은 책 · 책등 하나 = 1권</GroupLabel>
          <p className='flex flex-wrap items-baseline gap-2'>
            <BigNumber value={group.average} unit='권' />
            <span className='text-sm text-text-subtle'>전체 평균</span>
          </p>
          <div className='mt-2'>
            <Shelf group={group} />
          </div>
          {group.readers !== null && (
            <p className='mt-2.5 flex items-center gap-1.5 text-sm text-text-body'>
              <MintBook />
              읽은 사람만 보면 {formatChartValue(group.readers)}권
            </p>
          )}
        </div>
      ))}
    </div>
    <p className='text-xs leading-relaxed break-keep text-text-subtle'>
      파란 책등 = 전체 평균(안 읽은 사람 포함)
      {spec.groups.some((group) => group.readers !== null) &&
        ', 민트 책등 = 읽은 사람만 볼 때 더해지는 권수'}
    </p>
  </Figure>
);

/* ───────────── 나이별 표 (age-table) ───────────── */

/** 비율(사람)은 진한 잉크, 권수(막대)는 primary — 두 숫자가 같은 그림으로 보이지 않게 */
const RATE_TONE = 'fill-text-strong';

export const AgeTableChart = ({ spec }: { spec: AgeTableSpec }) => {
  const decimals = spec.rows.some(
    (row) => row.value !== null && !Number.isInteger(row.value)
  );
  const rateDecimals = spec.rows.some((row) => !Number.isInteger(row.rate));
  const linePos = spec.line === null ? null : (spec.line / spec.max) * 100;
  return (
    <Figure title={spec.title} note={spec.note} source={spec.source}>
      <div className='text-sm'>
        <div className='hidden grid-cols-[5.5rem_1fr_1fr] gap-x-5 border-b border-line pb-2 text-xs text-text-subtle sm:grid'>
          <span>나이</span>
          <span>10명 중 읽은 사람</span>
          <span>1년 평균 (안 읽은 사람 포함)</span>
        </div>
        <ul>
          {spec.rows.map((row) => (
            <li
              key={row.label}
              className='grid grid-cols-[4.25rem_1fr] items-center gap-x-3 gap-y-2 border-b border-line-soft py-3 sm:grid-cols-[5.5rem_1fr_1fr] sm:gap-x-5'
            >
              <span className='row-span-2 break-keep text-text-body sm:row-span-1'>
                {row.label}
              </span>
              <span className='flex items-center gap-2'>
                <TenPeople
                  rate={row.rate}
                  tone={RATE_TONE}
                  className='w-[100px] shrink-0 gap-[2px]'
                />
                <span className='font-semibold tabular-nums text-text-strong'>
                  {formatChartValue(row.rate, rateDecimals)}%
                </span>
              </span>
              {row.value === null ? (
                <span className='text-xs text-text-subtle'>자료 없음</span>
              ) : (
                <span className='flex items-center gap-2'>
                  <span className='relative h-2.5 flex-1 rounded-full bg-muted'>
                    <span
                      className='block h-full rounded-full bg-primary'
                      style={{ width: `${(row.value / spec.max) * 100}%` }}
                    />
                    {linePos !== null && (
                      <span
                        aria-hidden
                        className='absolute -top-1.5 -bottom-1.5 w-0.5 -translate-x-1/2 bg-text-strong'
                        style={{ left: `${linePos}%` }}
                      />
                    )}
                  </span>
                  <span className='w-12 shrink-0 text-right font-semibold tabular-nums text-text-strong'>
                    {formatChartValue(row.value, decimals)}
                    {spec.unit}
                  </span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <ul className='flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-text-subtle'>
        <li className='flex items-center gap-1.5'>
          <span className='w-2.5'>
            <Person fill={1} tone={RATE_TONE} />
          </span>
          읽은 사람 비율
        </li>
        <li className='flex items-center gap-1.5'>
          <span aria-hidden className='h-2.5 w-5 rounded-full bg-primary' />
          1년 평균 권수 (막대 끝 {formatChartValue(spec.max)}
          {spec.unit})
        </li>
        {spec.line !== null && (
          <li className='flex items-center gap-1.5'>
            <span aria-hidden className='h-3.5 w-0.5 bg-text-strong' />
            {spec.lineLabel ||
              `기준선 ${formatChartValue(spec.line)}${spec.unit}`}
          </li>
        )}
      </ul>
    </Figure>
  );
};

/** 틀린 블록 — 어드민 미리보기에서만 보인다 */
export const ChartError = ({ message }: { message: string }) => (
  <p className='mt-6 rounded-md border border-dashed border-destructive/50 p-3 text-sm text-destructive'>
    차트를 그리지 못했어요: {message}
  </p>
);
