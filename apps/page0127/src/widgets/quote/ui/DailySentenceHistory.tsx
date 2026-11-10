'use client';

import { useState } from 'react';

import { StatePanel } from '@repo/ui';
import { BookOpen } from 'lucide-react';

import { formatDrawDay, groupDrawsByMonth } from '../model/drawMonths';
import { DailySentenceReader } from './DailySentenceReader';

import type { DailySentence } from '@/entities/daily-sentence';

import styles from './SentencePage.module.css';

type DailySentenceHistoryProps = {
  draws: DailySentence[];
};

/**
 * "오늘의 문장" 탭 — 그날 펼친 책 한 페이지씩, 달마다 묶어 최신이 위.
 * 페이지를 누르면 리더가 열리고 거기서 책장 넘기듯 앞뒤로 넘겨 본다.
 */
export const DailySentenceHistory = ({ draws }: DailySentenceHistoryProps) => {
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

  return (
    <>
      <div className='flex flex-col gap-8'>
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
                펼친 페이지 {monthDraws.length}장
              </span>
            </div>
            <ul className='mt-3 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4'>
              {monthDraws.map((draw) => (
                <li key={draw.draw_date}>
                  <button
                    type='button'
                    onClick={() =>
                      setOpenIndex(indexOf.get(draw.draw_date) ?? 0)
                    }
                    aria-label={`${formatDrawDay(draw.draw_date)}에 펼친 문장 보기`}
                    className={`${styles.paper} flex aspect-[1/1.3] w-full flex-col justify-between p-3 pl-4 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}
                  >
                    <span
                      className={`${styles.meta} flex justify-between gap-2 text-[10px]`}
                    >
                      <span className='shrink-0'>
                        {formatDrawDay(draw.draw_date)}
                      </span>
                      <span className={`${styles.serif} truncate`}>
                        {draw.book_title}
                      </span>
                    </span>
                    <span
                      className={`${styles.serif} line-clamp-4 break-keep text-[13px] leading-relaxed`}
                    >
                      {draw.text}
                    </span>
                    <span
                      className={`${styles.meta} ${styles.serif} self-center text-[10px]`}
                    >
                      {draw.page ? `— ${draw.page} —` : '—'}
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
