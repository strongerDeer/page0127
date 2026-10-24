import Link from 'next/link';

import { CoverImage } from '@repo/ui';

import { toCoverSource } from '@/entities/book';
import { toWeekRangeLabel, toWeeksAgoLabel } from '@/entities/recap';

import { RecapRating } from './RecapRating';

import type { RecapBook, RecapWeek } from '@/entities/recap';

/** 한 주에 줄로 보여 줄 책 수. 맛보기로 한 번에 스무 권을 담은 주도 있어서 자른다 */
const MAX_ROWS = 5;

type RecapArchiveProps = {
  weeks: RecapWeek[];
  /** 주 구간 표기에서 올해면 연도를 뗀다 */
  currentYear: number;
};

/** '2, 0' → '2권 완독' · '0, 3' → '3권 담음' · 둘 다면 둘 다 */
const toWeekSummary = ({ completed, added }: RecapWeek): string =>
  [
    completed.length > 0 && `${completed.length}권 완독`,
    added.length > 0 && `${added.length}권 담음`,
  ]
    .filter(Boolean)
    .join(' · ');

/** 'YYYY-MM-DD' → '10월 15일' */
const toMonthDay = (dateKey: string): string => {
  const [, month, day] = dateKey.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
};

const RecapRow = ({
  book,
  kind,
}: {
  book: RecapBook;
  kind: 'completed' | 'added';
}) => (
  <li>
    <Link
      // 목록 링크는 미리 불러오지 않는다 (Vercel CPU — 00_docs 남은 작업 참고)
      prefetch={false}
      href={`/books/${book.id}`}
      className='flex items-center gap-3 rounded-lg p-1.5 hover:bg-sunken'
    >
      {/* 표지 칸은 늘 같은 크기 — 못 불러오면 빈 칸이 아니라 옅은 바탕만 남는다 */}
      <div className='h-[70px] w-12 shrink-0 overflow-hidden rounded bg-sunken'>
        <CoverImage
          {...toCoverSource(book)}
          alt=''
          width={48}
          height={70}
          className='book-cover h-full w-full rounded object-cover'
        />
      </div>
      <div className='min-w-0'>
        <p className='truncate font-medium text-text-strong'>{book.title}</p>
        <p className='mt-0.5 truncate text-sm text-text-subtle'>
          {[
            book.author,
            kind === 'completed' && book.completed_date
              ? `${toMonthDay(book.completed_date)} 완독`
              : '담음',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {kind === 'completed' && (
          <RecapRating rating={book.rating} isLifeBook={book.is_life_book} />
        )}
      </div>
    </Link>
  </li>
);

/**
 * 지난 회상 — 주마다 완독한 책·담은 책.
 *
 * 비어 있으면 안내 한 줄만. "0권" 같은 숫자는 쓰지 않는다(WeeklyRecapCard 와 같은 원칙).
 */
export const RecapArchive = ({ weeks, currentYear }: RecapArchiveProps) => {
  if (weeks.length === 0) {
    return (
      <p className='rounded-xl border border-line px-6 py-10 text-center text-sm text-text-subtle'>
        책을 끝내거나 서재에 담으면, 그 주의 기록이 여기에 쌓여요.
      </p>
    );
  }

  return (
    <ol className='space-y-6'>
      {weeks.map((week) => {
        const rows = [
          ...week.completed.map((book) => ({
            book,
            kind: 'completed' as const,
          })),
          ...week.added.map((book) => ({ book, kind: 'added' as const })),
        ];
        const hidden = rows.length - MAX_ROWS;

        return (
          <li
            key={week.startKey}
            aria-labelledby={`recap-week-${week.startKey}`}
            className='rounded-xl border border-line px-5 py-5 md:px-7'
          >
            <h2
              id={`recap-week-${week.startKey}`}
              className='flex flex-wrap items-baseline gap-x-2 text-base font-bold text-text-strong'
            >
              {toWeeksAgoLabel(week.weeksAgo)}
              <span className='text-sm font-normal text-text-subtle'>
                {toWeekRangeLabel(week, currentYear)}
              </span>
            </h2>
            <p className='mt-1 text-sm text-text-body'>{toWeekSummary(week)}</p>

            <ul className='mt-3 space-y-1'>
              {rows.slice(0, MAX_ROWS).map(({ book, kind }) => (
                <RecapRow key={book.id} book={book} kind={kind} />
              ))}
            </ul>

            {hidden > 0 && (
              <p className='mt-2 pl-1.5 text-sm text-text-subtle'>
                외 {hidden}권
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
};
