import { changeRate, type DateRange } from '@/shared/lib/admin/dateRange';

import type { CtaLocationRow, EventRow, PeriodPair } from '../lib/gaEvents';

type EventFunnelPanelProps = {
  range: DateRange;
  previous: DateRange;
  /** false = 오늘 하루만이라 견줄 끝난 날이 없음 → 증감 대신 '집계 중' */
  comparable: boolean;
  /** 고른 기간에 오늘이 있었지만 견주려고 어제까지로 잘랐다 */
  excludesToday: boolean;
  events: EventRow[];
  ctaLocations: CtaLocationRow[] | null;
  dbSignups: PeriodPair | null;
};

/**
 * '+50%' · '−20%' · 앞 기간이 0 이면 '새로' / 둘 다 0 이면 '—'.
 * partial(기간에 오늘이 들어 집계 중)이면 반나절을 꽉 찬 앞 기간과 견주게 돼 증감 대신 '집계 중'.
 */
export const ChangeBadge = ({
  pair,
  partial = false,
}: {
  pair: PeriodPair;
  partial?: boolean;
}) => {
  if (partial) {
    return <span className='text-xs text-text-subtle'>집계 중</span>;
  }
  const rate = changeRate(pair.current, pair.previous);
  if (rate === null) {
    return (
      <span className='text-xs text-text-subtle'>
        {pair.current > 0 ? '새로' : '—'}
      </span>
    );
  }
  const pct = Math.round(rate * 100);
  return (
    <span className='text-xs tabular-nums text-text-subtle'>
      <span className='font-medium text-text-strong'>
        {pct > 0 ? '+' : pct < 0 ? '−' : '±'}
        {Math.abs(pct)}%
      </span>
    </span>
  );
};

const n = (v: number) => v.toLocaleString('ko-KR');

/**
 * 가입 유도 효과 — 맛보기 → CTA → 가입 → 첫 책 이벤트를 현재·앞 기간으로 나란히.
 * GA sign_up 은 브라우저 이벤트라 광고 차단·동의 거부로 빠질 수 있어, DB 가입 수를 같이 둔다.
 */
export const EventFunnelPanel = ({
  range,
  previous,
  comparable,
  excludesToday,
  events,
  ctaLocations,
  dbSignups,
}: EventFunnelPanelProps) => (
  <div className='grid gap-3 lg:grid-cols-3'>
    <div className='overflow-x-auto rounded-lg border border-line p-4 lg:col-span-2'>
      <div className='mb-2 flex flex-wrap items-baseline justify-between gap-2'>
        <div className='text-sm font-medium'>이벤트 깔때기</div>
        <span className='text-xs text-text-subtle'>
          {range.label}
          {excludesToday && '(오늘은 집계 중이라 뺌)'} vs 앞 기간(
          {previous.label}) · 횟수 (사용자)
        </span>
      </div>
      <table className='w-full text-sm'>
        <thead>
          <tr className='border-b border-line text-xs text-text-subtle'>
            <th className='px-2 py-1.5 text-left font-normal'>이벤트</th>
            <th className='px-2 py-1.5 text-right font-normal'>이번</th>
            <th className='px-2 py-1.5 text-right font-normal'>앞 기간</th>
            <th className='px-2 py-1.5 text-right font-normal'>증감</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.name} className='border-b border-line/60'>
              <td className='px-2 py-1.5'>
                {e.label}
                <span className='ml-1 font-mono text-[11px] text-text-subtle'>
                  {e.name}
                </span>
              </td>
              <td className='px-2 py-1.5 text-right tabular-nums'>
                {n(e.count.current)}{' '}
                <span className='text-xs text-text-subtle'>
                  ({n(e.users.current)})
                </span>
              </td>
              <td className='px-2 py-1.5 text-right tabular-nums text-text-subtle'>
                {n(e.count.previous)} ({n(e.users.previous)})
              </td>
              <td className='px-2 py-1.5 text-right'>
                <ChangeBadge pair={e.count} partial={!comparable} />
              </td>
            </tr>
          ))}
          {dbSignups && (
            <tr className='font-medium'>
              <td className='px-2 py-1.5'>
                실제 가입{' '}
                <span className='text-xs font-normal text-text-subtle'>
                  DB · 운영자 제외
                </span>
              </td>
              <td className='px-2 py-1.5 text-right tabular-nums'>
                {n(dbSignups.current)}
              </td>
              <td className='px-2 py-1.5 text-right tabular-nums text-text-subtle'>
                {n(dbSignups.previous)}
              </td>
              <td className='px-2 py-1.5 text-right'>
                <ChangeBadge pair={dbSignups} partial={!comparable} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    <div className='rounded-lg border border-line p-4'>
      <div className='mb-2 text-sm font-medium'>CTA 위치별 클릭</div>
      {ctaLocations === null ? (
        <p className='text-xs text-text-subtle'>
          GA 관리 &gt; 맞춤 정의에 이벤트 범위 측정기준 <code>location</code> 을
          등록해야 보입니다. 등록한 날부터 쌓입니다.
        </p>
      ) : ctaLocations.length === 0 ? (
        <p className='text-xs text-text-subtle'>
          이 기간에 CTA 클릭이 없습니다.
        </p>
      ) : (
        <ul className='space-y-1.5 text-sm'>
          {ctaLocations.map((c) => (
            <li
              key={c.location}
              className='flex items-baseline justify-between gap-2'
            >
              <span className='truncate font-mono text-xs'>{c.location}</span>
              <span className='shrink-0 tabular-nums'>
                {n(c.count.current)}{' '}
                <span className='text-xs text-text-subtle'>
                  / {n(c.count.previous)}
                </span>{' '}
                <ChangeBadge pair={c.count} partial={!comparable} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
);
