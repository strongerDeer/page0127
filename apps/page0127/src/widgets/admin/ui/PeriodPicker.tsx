import Link from 'next/link';

import { type DateRange, PRESET_DAYS } from '@/shared/lib/admin/dateRange';

type PeriodPickerProps = {
  /** 현재 화면 경로 — '/admin', '/admin/analytics' */
  basePath: string;
  range: DateRange;
  /** 사용자 지정 상한 (KST 오늘) — 오늘을 고르면 화면이 "집계 중"으로 표시한다 */
  maxDate: string;
};

const PRESETS = [
  { preset: 'today', label: '오늘' },
  { preset: '7d', label: '1주' },
  { preset: '30d', label: '1달' },
] as const satisfies { preset: keyof typeof PRESET_DAYS; label: string }[];

const chip =
  'rounded border px-3 py-1.5 text-sm transition-colors hover:bg-accent';

/**
 * 어드민 기간 선택 — 오늘 · 1주 · 1달 · 사용자 지정.
 *
 * 서버 컴포넌트다: 프리셋은 링크, 사용자 지정은 GET 폼이라 JS 없이도 동작하고,
 * 고른 기간이 URL(?range=…)에 남아 새로고침·공유해도 그대로 열린다.
 * 해석(잘못된 값 바로잡기)은 parseDateRange 한 곳이 맡는다.
 */
export const PeriodPicker = ({
  basePath,
  range,
  maxDate,
}: PeriodPickerProps) => (
  <div
    role='group'
    aria-label='조회 기간'
    className='flex flex-wrap items-center gap-2'
  >
    {PRESETS.map(({ preset, label }) => {
      const active = range.preset === preset;
      return (
        <Link
          key={preset}
          href={`${basePath}?range=${preset}`}
          aria-current={active ? 'true' : undefined}
          className={`${chip} ${
            active
              ? 'border-text-strong font-medium text-text-strong'
              : 'border-line text-text-subtle'
          }`}
        >
          {label}
        </Link>
      );
    })}

    <form
      action={basePath}
      method='get'
      className={`flex flex-wrap items-center gap-1.5 rounded border px-2 py-1 ${
        range.preset === 'custom' ? 'border-text-strong' : 'border-line'
      }`}
    >
      <input type='hidden' name='range' value='custom' />
      <label className='sr-only' htmlFor='period-from'>
        시작일
      </label>
      <input
        id='period-from'
        type='date'
        name='from'
        required
        max={maxDate}
        defaultValue={range.from}
        className='rounded bg-transparent px-1 py-0.5 text-sm tabular-nums'
      />
      <span className='text-sm text-text-subtle' aria-hidden>
        ~
      </span>
      <label className='sr-only' htmlFor='period-to'>
        종료일
      </label>
      <input
        id='period-to'
        type='date'
        name='to'
        required
        max={maxDate}
        defaultValue={range.to}
        className='rounded bg-transparent px-1 py-0.5 text-sm tabular-nums'
      />
      <button
        type='submit'
        className='rounded px-2 py-0.5 text-sm font-medium hover:bg-accent'
      >
        사용자 지정
      </button>
    </form>
  </div>
);
