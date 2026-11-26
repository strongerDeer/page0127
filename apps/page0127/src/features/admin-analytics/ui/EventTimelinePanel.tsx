'use client';

import { useState } from 'react';

import { adminInk } from '@/shared/lib/admin/adminChartColors';
import { shortDate } from '@/shared/lib/admin/dateRange';

import { heatLevel, type TimelineGroup } from '../lib/eventTimeline';

import type { GaEventTimelineResult } from '../api/getGaEventTimeline';

type View = 'daily' | 'hourly';

/** 진하기 0~4 → 브랜드 블루의 불투명도. 0 은 빈 칸(선 색) */
const LEVEL_OPACITY = [0, 0.25, 0.45, 0.7, 1] as const;

const n = (v: number) => v.toLocaleString('ko-KR');

const Cell = ({
  count,
  max,
  title,
}: {
  count: number;
  max: number;
  title: string;
}) => {
  const level = heatLevel(count, max);
  return (
    <td className='p-px'>
      <span
        title={title}
        aria-label={title}
        className='block size-3 rounded-[3px] bg-line/70 sm:size-3.5'
        style={
          level > 0
            ? {
                backgroundColor: adminInk.primary,
                opacity: LEVEL_OPACITY[level],
              }
            : undefined
        }
      />
    </td>
  );
};

const Grid = ({
  groups,
  columns,
  columnTitle,
  header,
}: {
  groups: TimelineGroup[];
  columns: number;
  /** 칸 i 의 이름(툴팁) — '11/26' · '오늘 14시' */
  columnTitle: (i: number) => string;
  /** 머리줄 칸 i 에 적을 짧은 글자 (빈 문자열이면 비움) */
  header: (i: number) => string;
}) => (
  <div className='overflow-x-auto'>
    <table className='border-separate border-spacing-0 text-sm'>
      <thead>
        <tr className='text-[10px] text-text-subtle'>
          <th className='sticky left-0 bg-background' />
          {Array.from({ length: columns }, (_, i) => (
            <th key={i} className='p-0 text-left font-normal'>
              <span className='block w-3 overflow-visible whitespace-nowrap sm:w-3.5'>
                {header(i)}
              </span>
            </th>
          ))}
          <th className='pl-2 text-right font-normal'>합계</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((g) => (
          <GroupRows
            key={g.key}
            group={g}
            columns={columns}
            columnTitle={columnTitle}
          />
        ))}
      </tbody>
    </table>
  </div>
);

const GroupRows = ({
  group,
  columns,
  columnTitle,
}: {
  group: TimelineGroup;
  columns: number;
  columnTitle: (i: number) => string;
}) => (
  <>
    <tr>
      <td
        colSpan={columns + 2}
        className='sticky left-0 bg-background pb-1 pt-3 text-xs font-medium text-text-subtle'
      >
        {group.label}
      </td>
    </tr>
    {group.rows.map((r) => {
      const max = Math.max(0, ...r.counts);
      return (
        <tr key={r.name} className={r.total === 0 ? 'opacity-50' : undefined}>
          <td className='sticky left-0 z-10 max-w-36 bg-background py-0.5 pr-3'>
            <span className='block truncate'>{r.label}</span>
            <span className='block truncate font-mono text-[10px] text-text-subtle'>
              {r.name}
            </span>
          </td>
          {r.counts.slice(0, columns).map((c, i) => (
            <Cell
              key={i}
              count={c}
              max={max}
              title={`${columnTitle(i)} · ${r.label} ${n(c)}회`}
            />
          ))}
          <td className='pl-2 text-right tabular-nums'>{n(r.total)}</td>
        </tr>
      );
    })}
  </>
);

/**
 * 이벤트 현황 — 어떤 이벤트가 언제 났나(HJ 2026-11-26 A안).
 * 칸 진하기는 줄마다 그 이벤트의 가장 많은 칸 기준이라, 큰 이벤트끼리 견주는 표가 아니라
 * "이 이벤트가 언제 몰렸나"를 보는 판이다. 숫자 비교는 합계 열로 한다.
 */
export const EventTimelinePanel = ({
  result,
}: {
  result: GaEventTimelineResult;
}) => {
  const [view, setView] = useState<View>('hourly');
  if (result.status !== 'ok') return null;

  const groups = view === 'daily' ? result.daily : result.hourly;
  const empty = groups.every((g) => g.rows.every((r) => r.total === 0));

  return (
    <div className='rounded-lg border border-line p-4'>
      <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
        <div role='group' aria-label='보기' className='flex gap-1 text-xs'>
          {(
            [
              ['hourly', '어제·오늘 시간별'],
              ['daily', '날짜별'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type='button'
              aria-pressed={view === key}
              onClick={() => setView(key)}
              className='rounded-md border border-line px-2.5 py-1 aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:font-medium'
            >
              {label}
            </button>
          ))}
        </div>
        <span className='text-xs text-text-subtle'>
          {view === 'daily'
            ? `${shortDate(result.days[0])} ~ ${shortDate(result.days.at(-1) ?? result.days[0])}`
            : '앞 24칸 어제 · 뒤 24칸 오늘'}{' '}
          · 진할수록 그 이벤트가 많이 난 칸 · GA는 몇 시간 늦게 채워져요
        </span>
      </div>

      {empty ? (
        <p className='py-6 text-center text-sm text-text-subtle'>
          이 기간에 기록된 이벤트가 없어요.
        </p>
      ) : view === 'daily' ? (
        <Grid
          groups={groups}
          columns={result.days.length}
          columnTitle={(i) => shortDate(result.days[i])}
          // 날짜 머리글은 7일마다(첫 칸 포함) — 칸이 좁아 매일 적으면 겹친다
          header={(i) =>
            i % 7 === 0 ? String(Number(result.days[i].slice(8, 10))) : ''
          }
        />
      ) : (
        <Grid
          groups={groups}
          columns={48}
          columnTitle={(i) => `${i < 24 ? '어제' : '오늘'} ${i % 24}시`}
          header={(i) =>
            i === 0
              ? '어제'
              : i === 24
                ? '오늘'
                : i % 6 === 0
                  ? `${i % 24}`
                  : ''
          }
        />
      )}
    </div>
  );
};
