import { BookCover, StatePanel } from '@repo/ui';
import { BookOpen } from 'lucide-react';

import { formatSentenceSource } from '@/entities/daily-sentence';

import { formatDrawDay, groupDrawsByMonth } from '../model/drawMonths';

import type { DailySentence } from '@/entities/daily-sentence';

type DailySentenceHistoryProps = {
  draws: DailySentence[];
};

/**
 * "오늘의 문장 기록" — 펼친 날짜순(최신 위), 달마다 제목.
 * 캘린더 책갈피를 하루씩 눌러 보지 않아도 그동안 받은 문장을 한 번에 훑는다.
 */
export const DailySentenceHistory = ({ draws }: DailySentenceHistoryProps) => {
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

  return (
    <div className='flex flex-col gap-8'>
      {groupDrawsByMonth(draws).map(({ month, label, draws: monthDraws }) => (
        <section key={month} aria-labelledby={`draws-${month}`}>
          <h3
            id={`draws-${month}`}
            className='text-sm font-bold text-text-strong'
          >
            {label}
          </h3>
          <ol className='mt-3 flex flex-col gap-3'>
            {monthDraws.map((draw) => (
              <li
                key={draw.draw_date}
                className='flex gap-4 rounded-2xl border border-line-soft bg-card p-4'
              >
                <div className='shrink-0'>
                  <BookCover
                    src={draw.cover_image}
                    title={draw.book_title}
                    author={draw.author}
                    size='xs'
                    small
                    decorative
                  />
                </div>
                <div className='min-w-0 flex-1'>
                  <p className='text-xs font-medium text-text-subtle'>
                    <time dateTime={draw.draw_date}>
                      {formatDrawDay(draw.draw_date)}
                    </time>
                  </p>
                  <blockquote className='mt-1 whitespace-pre-wrap break-keep text-sm font-medium leading-relaxed text-text-strong'>
                    {draw.text}
                  </blockquote>
                  <p className='mt-1.5 text-xs text-text-subtle'>
                    {formatSentenceSource(draw)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
};
