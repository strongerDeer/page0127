'use client';

import { useReducer, useState } from 'react';

import Link from 'next/link';

import {
  BookCover,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@repo/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import {
  buildCalendarMonth,
  getInitialCalendarMonth,
  isRated,
  toCoverSource,
} from '@/entities/book';

import { CHART_COLORS } from '@/features/stats/model/balanceCopy';

import type { Book, CalendarDay } from '@/entities/book';

type ReadingCalendarProps = {
  /** 방문자 = 공개 책만, 주인 = 비공개 포함(반투명) */
  books: Book[];
  year: number;
  /** 한국 시간 기준 오늘 'YYYY-MM-DD' */
  today: string;
  isOwner: boolean;
  bookHref: (book: Book) => string;
};

type MonthState = { year: number; month: number };
type MonthAction =
  { type: 'PREV' } | { type: 'NEXT' } | { type: 'GO'; month: number };

// 12월→1월 경계에서 연·월이 따로 바뀌면 한 번 '2026년 13월' 같은 상태를 거친다 → 한 액션으로 같이 바꾼다
const monthReducer = (state: MonthState, action: MonthAction): MonthState => {
  switch (action.type) {
    case 'PREV':
      return state.month === 1
        ? { year: state.year - 1, month: 12 }
        : { ...state, month: state.month - 1 };
    case 'NEXT':
      return state.month === 12
        ? { year: state.year + 1, month: 1 }
        : { ...state, month: state.month + 1 };
    case 'GO':
      return { ...state, month: action.month };
  }
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
/** 표지 겹쳐 쌓기 — 이보다 많으면 +N */
const MAX_COVERS = 2;

/**
 * ⑥ 독서 달력 — 이미 받은 책 목록으로 그린다(네트워크 요청 없음).
 *
 * 예전 달력은 월을 넘길 때마다 API 를 불렀는데, 응답에 없는 `success` 필드를 검사해
 * 항상 에러로 떨어졌다 → 첫 달 말고는 늘 0권이었다. 지금은 계산이 전부 buildCalendarMonth 안에 있다.
 * 연도 탭이 바뀌면 부모가 key 를 바꿔 이 컴포넌트를 새로 만든다(초기 달 다시 계산).
 */
export const ReadingCalendar = ({
  books,
  year,
  today,
  isOwner,
  bookHref,
}: ReadingCalendarProps) => {
  const [view, dispatch] = useReducer(monthReducer, {
    year,
    month: getInitialCalendarMonth(books, year, today),
  });
  const [selected, setSelected] = useState<CalendarDay | null>(null);

  const month = buildCalendarMonth(books, view.year, view.month);
  const { summary } = month;

  return (
    <section className='rounded-2xl border border-line-soft bg-card p-5'>
      <div className='flex items-center justify-between'>
        <h3 className='text-base font-bold text-text-strong'>독서 캘린더</h3>
        <div className='flex items-center gap-1'>
          <Button
            variant='outline'
            size='icon-sm'
            className='shadow-none'
            onClick={() => dispatch({ type: 'PREV' })}
            aria-label='이전 달'
          >
            <ChevronLeft className='size-4' />
          </Button>
          <span className='min-w-[86px] text-center text-sm font-medium text-text-body'>
            {view.year}년 {view.month}월
          </span>
          <Button
            variant='outline'
            size='icon-sm'
            className='shadow-none'
            onClick={() => dispatch({ type: 'NEXT' })}
            aria-label='다음 달'
          >
            <ChevronRight className='size-4' />
          </Button>
        </div>
      </div>

      {/* 월 칩 — 월별 추이 차트를 대신한다. 공개 완독이 있는 달에 점 */}
      <div className='mt-3 grid grid-cols-12 gap-0.5'>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const isOn = m === view.month;
          const hasBooks = month.activeMonths.includes(m);
          return (
            <button
              key={m}
              type='button'
              data-month-chip
              onClick={() => dispatch({ type: 'GO', month: m })}
              aria-pressed={isOn}
              aria-label={`${m}월${hasBooks ? ', 완독 있음' : ''}`}
              className={`relative rounded-md py-1 text-xs ${
                isOn
                  ? 'bg-primary text-primary-foreground'
                  : 'text-text-subtle hover:bg-sunken'
              }`}
            >
              {m}
              {hasBooks && (
                <span
                  aria-hidden
                  className={`absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full ${
                    isOn ? 'bg-primary-foreground' : 'bg-primary'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 날짜 숫자가 칸 왼쪽 위에 있으므로 요일도 왼쪽에 맞춘다 (가운데면 열이 어긋나 보인다) */}
      <div className='mt-3 grid grid-cols-7 px-1 text-left text-xs text-text-subtle'>
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={i === 0 ? 'text-rank-up' : i === 6 ? 'text-primary' : ''}
          >
            {d}
          </div>
        ))}
      </div>

      <div className='mt-1 grid grid-cols-7'>
        {month.weeks.flat().map((day, index) => {
          if (!day) {
            return (
              <div
                key={`empty-${index}`}
                className='h-14 border-t border-line-soft'
              />
            );
          }
          const count = day.completions.length;
          return (
            <button
              key={day.date}
              type='button'
              disabled={count === 0}
              onClick={() => setSelected(day)}
              aria-label={
                count > 0
                  ? `${view.month}월 ${day.day}일, ${count}권 완독`
                  : undefined
              }
              className='relative h-14 border-t border-line-soft px-1 pt-0.5 text-left text-xs text-text-subtle enabled:hover:bg-sunken'
            >
              {day.day}

              {/* 기간 막대 — 시작일을 적은 책만. 줄마다 3px */}
              {day.ranges.map((range) => (
                <span
                  key={range.book.id}
                  aria-hidden
                  className={`absolute ${range.isStart ? 'left-1 rounded-l-full' : 'left-0'} ${
                    range.isEnd ? 'right-1 rounded-r-full' : 'right-0'
                  } ${range.book.is_public ? '' : 'opacity-50'}`}
                  style={{
                    height: 3,
                    bottom: 3 + range.lane * 5,
                    backgroundColor: CHART_COLORS[range.colorIndex],
                  }}
                />
              ))}
              {day.overflow > 0 && (
                <span className='absolute bottom-4 left-1 text-xs text-text-subtle'>
                  +{day.overflow}
                </span>
              )}

              {/* 완독 표지 — 같은 날 여러 권이면 겹쳐 쌓고 +N */}
              {count > 0 && (
                <span className='absolute bottom-1.5 right-1 flex'>
                  {day.completions
                    .slice(0, MAX_COVERS)
                    .map(({ book, colorIndex }, i) => (
                      <span
                        key={book.id}
                        className={`relative block ${i > 0 ? '-ml-4' : ''} ${
                          book.is_public ? '' : 'opacity-50'
                        }`}
                        style={{
                          width: 26,
                          height: 38,
                          outline:
                            colorIndex !== null
                              ? `1.5px solid ${CHART_COLORS[colorIndex]}`
                              : undefined,
                        }}
                      >
                        <BookCover
                          {...toCoverSource(book)}
                          title={book.title}
                          decorative
                          size='fill'
                          sizes='26px'
                        />
                      </span>
                    ))}
                  {count > MAX_COVERS && (
                    <span className='ml-0.5 self-end text-xs font-medium text-text-body'>
                      +{count - MAX_COVERS}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className='mt-3 text-xs text-text-subtle'>
        {view.month}월{' '}
        <b className='text-text-strong'>{summary.publicCount}권</b> 완독
        {summary.publicPages > 0 &&
          ` · ${summary.publicPages.toLocaleString()}쪽`}
        {isOwner &&
          summary.privateCount > 0 &&
          ` · 비공개 ${summary.privateCount}권`}
      </p>

      <Dialog open={selected !== null} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected && `${view.month}월 ${selected.day}일 완독한 책`}
            </DialogTitle>
          </DialogHeader>
          <ul className='divide-y divide-line-soft'>
            {selected?.completions.map(({ book }) => (
              <li key={book.id}>
                <Link
                  href={bookHref(book)}
                  className='flex items-center gap-3 py-3 hover:text-primary'
                >
                  <BookCover
                    {...toCoverSource(book)}
                    title={book.title}
                    decorative
                    size='xs'
                    small
                  />
                  <span className='min-w-0 flex-1'>
                    <span className='block truncate text-sm font-medium text-text-strong'>
                      {book.title}
                    </span>
                    <span className='block truncate text-sm text-text-subtle'>
                      {book.author}
                    </span>
                  </span>
                  {!book.is_public && (
                    <span className='text-xs text-text-subtle'>비공개</span>
                  )}
                  {isRated(book.rating) && (
                    <span className='text-sm font-medium text-text-body'>
                      {book.is_life_book ? '인생책' : `${book.rating}점`}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </section>
  );
};
