'use client';

import { useState } from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { WEEKDAYS } from '@/entities/daily-sentence';

import { CarrotSvg } from '@/features/daily-sentence';

import { formatDrawDay } from '../model/drawMonths';
import { monthGrid, shiftMonth } from '../model/monthGrid';

import type { DailySentence } from '@/entities/daily-sentence';

import styles from './SentencePage.module.css';

type SentenceGardenProps = {
  /** 뽑은 문장 전부(순서 무관) */
  draws: DailySentence[];
  /** 오늘(KST 'YYYY-MM-DD') — 서버가 정해 넘긴다 */
  todayKey: string;
  /** 아래 카드를 누르면 — 리더로 크게 펼친다 */
  onOpen: (draw: DailySentence) => void;
};

/**
 * 당근 달력 (HJ A안, 2026-11-26).
 *
 * 문장을 전부 깔지 않고, 한 달 달력에 뽑은 날마다 당근만 심어 둔다.
 * 당근을 누르면 아래 카드가 그날 문장으로 바뀐다 — 처음엔 오늘(없으면 가장 최근) 문장.
 * 서재 독서 캘린더의 "날을 고르면 아래 패널" 과 같은 방식이다.
 */
export const SentenceGarden = ({
  draws,
  todayKey,
  onOpen,
}: SentenceGardenProps) => {
  const byDate = new Map(draws.map((d) => [d.draw_date, d]));
  const latest = [...byDate.keys()].sort().at(-1) ?? todayKey;
  const firstMonth =
    [...byDate.keys()].sort()[0]?.slice(0, 7) ?? todayKey.slice(0, 7);
  const thisMonth = todayKey.slice(0, 7);

  const [selected, setSelected] = useState(
    byDate.has(todayKey) ? todayKey : latest
  );
  const [month, setMonth] = useState(selected.slice(0, 7));

  const cells = monthGrid(month);
  const carrots = cells.filter((date) => date && byDate.has(date)).length;
  const picked = byDate.get(selected);
  const [y, m] = month.split('-').map(Number);

  return (
    <div className='flex max-w-xl flex-col gap-5'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-1'>
          <button
            type='button'
            aria-label='이전 달'
            disabled={month <= firstMonth}
            onClick={() => setMonth(shiftMonth(month, -1))}
            className='rounded-full p-1 text-text-subtle hover:text-text-strong disabled:opacity-30'
          >
            <ChevronLeft className='size-4' aria-hidden />
          </button>
          <h3 className='min-w-24 text-center text-base font-bold text-text-strong'>
            {y}년 {m}월
          </h3>
          <button
            type='button'
            aria-label='다음 달'
            disabled={month >= thisMonth}
            onClick={() => setMonth(shiftMonth(month, 1))}
            className='rounded-full p-1 text-text-subtle hover:text-text-strong disabled:opacity-30'
          >
            <ChevronRight className='size-4' aria-hidden />
          </button>
        </div>
        <span className='text-xs text-text-subtle'>당근 {carrots}개</span>
      </div>

      <div
        role='grid'
        aria-label={`${y}년 ${m}월 당근 달력`}
        className={styles.garden}
      >
        {WEEKDAYS.map((w) => (
          <span key={w} role='columnheader' className={styles.gardenWeekday}>
            {w}
          </span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`blank-${i}`} aria-hidden />;
          const day = Number(date.slice(8, 10));
          const draw = byDate.get(date);
          const common = {
            className: styles.gardenCell,
            'data-today': date === todayKey ? '' : undefined,
            'data-future': date > todayKey ? '' : undefined,
          };
          if (!draw) {
            return (
              <span key={date} {...common}>
                {day}
              </span>
            );
          }
          return (
            <button
              key={date}
              type='button'
              {...common}
              data-has=''
              data-selected={date === selected ? '' : undefined}
              aria-pressed={date === selected}
              aria-label={`${formatDrawDay(date)} 문장 보기`}
              onClick={() => setSelected(date)}
            >
              {day}
              <CarrotSvg className={styles.gardenCarrot} />
            </button>
          );
        })}
      </div>

      {picked && (
        <button
          type='button'
          onClick={() => onOpen(picked)}
          aria-label={`${formatDrawDay(picked.draw_date)} 문장 크게 보기`}
          className={`${styles.card} flex min-h-40 w-full flex-col gap-4 p-5 text-left sm:p-7`}
        >
          <span className={`${styles.meta} text-xs font-semibold`}>
            {picked.draw_date === todayKey ? '오늘 · ' : ''}
            {formatDrawDay(picked.draw_date)}
          </span>
          <span className='flex-1 break-keep text-lg font-semibold leading-relaxed sm:text-2xl sm:leading-relaxed'>
            {picked.text}
          </span>
          <span className={`${styles.meta} text-xs`}>
            《{picked.book_title}》
            {picked.page && (
              // 쪽수는 한 덩어리로 — "·" 뒤에서 줄이 끊기지 않게
              <span className='whitespace-nowrap'>{` · p. ${picked.page}`}</span>
            )}
          </span>
        </button>
      )}
    </div>
  );
};
