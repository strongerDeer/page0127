'use client';

import { useEffect, useRef, useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui';
import { Info } from 'lucide-react';

import type { LeagueMetric } from '../model/readingLeague';

/** 클릭·포커스도 지원해 터치 환경에서 비교 기준이 사라지지 않게 한다. */
export const LeagueInfo = ({
  year,
  metric,
  missingPages,
}: {
  year: number;
  metric: LeagueMetric;
  missingPages?: string;
}) => {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const trigger = useRef<HTMLButtonElement>(null);
  const enter = () => {
    clearTimeout(timer.current);
    setOpen(true);
  };
  const leave = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (document.activeElement !== trigger.current) setOpen(false);
    }, 180);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={trigger}
          type='button'
          aria-label='독서 배틀 집계 기준'
          className='inline-flex size-8 shrink-0 items-center justify-center rounded-full text-text-subtle hover:bg-card focus-visible:outline-2 focus-visible:outline-ring'
          onMouseEnter={enter}
          onMouseLeave={leave}
          onFocus={enter}
          onBlur={() => setOpen(false)}
          onClick={(event) => {
            event.preventDefault();
            enter();
          }}
        >
          <Info size={16} aria-hidden='true' />
        </button>
      </PopoverTrigger>
      <PopoverContent
        aria-label='독서 배틀 집계 기준'
        className='max-w-[calc(100vw-2rem)] space-y-2 text-xs leading-relaxed'
        align='start'
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onMouseEnter={enter}
        onMouseLeave={leave}
      >
        <p>서울 기준 {year}년 공개 완독 · 재독은 한 권</p>
        <p>동점은 공동 순위예요.</p>
        {metric === 'pages' && (
          <p>완독한 책의 쪽수 합계 · 쪽수 미등록 책 제외</p>
        )}
        {metric === 'genres' && <p>서재 대분류 기준 · 기타·분류 미상 제외</p>}
        {metric === 'pages' && missingPages && (
          <p role='status'>{missingPages}</p>
        )}
      </PopoverContent>
    </Popover>
  );
};
