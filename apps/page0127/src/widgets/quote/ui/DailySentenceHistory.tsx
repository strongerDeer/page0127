'use client';

import { useState } from 'react';

import { StatePanel } from '@repo/ui';
import { BookOpen } from 'lucide-react';

import { formatDrawDay, groupDrawsByMonth } from '../model/drawMonths';
import { DailySentenceReader } from './DailySentenceReader';
import { WeekCarrots } from './WeekCarrots';

import type { DailySentence } from '@/entities/daily-sentence';

import styles from './SentencePage.module.css';

type DailySentenceHistoryProps = {
  draws: DailySentence[];
  /** 오늘(KST 'YYYY-MM-DD') — 이번 주 7칸 기준 */
  todayKey: string;
};

/**
 * "오늘의 문장" 탭 — 위에 이번 주 7칸(당근), 아래에 뽑은 문장 종이 카드를 달마다 묶어 최신이 위.
 * 인스타 캐러셀 5번 카드 모양(HJ A안, 2026-11-26). 카드를 누르면 리더가 열리고
 * 거기서 책장 넘기듯 앞뒤로 넘겨 본다.
 */
export const DailySentenceHistory = ({
  draws,
  todayKey,
}: DailySentenceHistoryProps) => {
  // 열린 페이지의 위치(draws 안 인덱스). null 이면 닫힘
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (draws.length === 0) {
    return (
      <StatePanel
        icon={<BookOpen className='size-6' />}
        message={
          <>
            아직 펼친 오늘의 문장이 없어요.
            <br />
            서재의 독서 캘린더에서 하루에 한 번 펼칠 수 있어요.
          </>
        }
      />
    );
  }

  // 리더는 달 구분 없이 이 순서(최신 → 과거)로 넘긴다 — 그리드와 같은 순서
  const months = groupDrawsByMonth(draws);
  const ordered = months.flatMap((m) => m.draws);
  const indexOf = new Map(ordered.map((d, i) => [d.draw_date, i]));
  const drawnDates = new Set(draws.map((d) => d.draw_date));

  return (
    <>
      <div className='flex flex-col gap-10'>
        <WeekCarrots todayKey={todayKey} drawnDates={drawnDates} />

        {months.map(({ month, label, draws: monthDraws }) => (
          <section key={month} aria-labelledby={`draws-${month}`}>
            <div className='flex items-baseline justify-between'>
              <h3
                id={`draws-${month}`}
                className='text-sm font-bold text-text-strong'
              >
                {label}
              </h3>
              <span className='text-xs text-text-subtle'>
                {monthDraws.length}장
              </span>
            </div>
            <ul className='mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4'>
              {monthDraws.map((draw) => (
                <li key={draw.draw_date}>
                  <button
                    type='button'
                    onClick={() =>
                      setOpenIndex(indexOf.get(draw.draw_date) ?? 0)
                    }
                    aria-label={`${formatDrawDay(draw.draw_date)}에 펼친 문장 보기`}
                    className={`${styles.card} flex h-full min-h-36 w-full flex-col gap-3 p-4 text-left sm:min-h-40 sm:p-5`}
                  >
                    <span className={`${styles.meta} text-xs font-semibold`}>
                      {formatDrawDay(draw.draw_date)}
                    </span>
                    <span className='flex-1 break-keep text-[15px] font-semibold leading-relaxed sm:text-base'>
                      {draw.text}
                    </span>
                    <span className={`${styles.meta} text-xs`}>
                      《{draw.book_title}》
                      {draw.page && (
                        // 쪽수는 한 덩어리로 — "·" 뒤에서 줄이 끊기지 않게
                        <span className='whitespace-nowrap'>
                          {` · p. ${draw.page}`}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <DailySentenceReader
        draws={ordered}
        index={openIndex}
        onIndexChange={setOpenIndex}
      />
    </>
  );
};
