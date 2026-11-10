'use client';

import { type ReactNode, useReducer, useState } from 'react';

import Link from 'next/link';

import { BookCover, Button } from '@repo/ui';
import { Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';

import {
  buildCalendarMonth,
  getInitialCalendarMonth,
  isRated,
  readingDayCount,
  toCoverSource,
} from '@/entities/book';
import { formatSentenceSource } from '@/entities/daily-sentence';

import { CHART_COLORS } from '@/features/stats/model/balanceCopy';

import type { Book, CalendarDay } from '@/entities/book';
import type { DailySentence } from '@/entities/daily-sentence';

type ReadingCalendarProps = {
  /** 방문자 = 공개 책만, 주인 = 비공개 포함(반투명) */
  books: Book[];
  year: number;
  /** 한국 시간 기준 오늘 'YYYY-MM-DD' */
  today: string;
  isOwner: boolean;
  bookHref: (book: Book) => string;
  /** 처음 보여줄 달 — 월별 차트 막대를 누르면 부모가 key 와 함께 바꿔 그 달로 다시 연다 */
  initialMonth?: number;
  /**
   * 오늘의 문장을 펼친 날 — 주인에게만 넘어온다(나만 보기).
   * 완독 집계(completions)와는 다른 배열이라 권수·쪽수에 섞이지 않는다.
   */
  sentenceDraws?: DailySentence[];
  /**
   * 오늘 칸을 골랐을 때 패널에 그릴 것 — 주인 서재가 "오늘의 문장" 펼치기 카드를 넣는다.
   * 펼치기·애니메이션·서버 액션은 그 카드(features/daily-sentence)가 맡는다.
   */
  todaySlot?: ReactNode;
  /** 패널 맨 아래 — 주인 서재의 내가 모은 문장 한 줄·주간 회상 링크 */
  footerSlot?: ReactNode;
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
  initialMonth,
  sentenceDraws = [],
  todaySlot,
  footerSlot,
}: ReadingCalendarProps) => {
  const [view, dispatch] = useReducer(monthReducer, {
    year,
    month: initialMonth ?? getInitialCalendarMonth(books, year, today),
  });
  // 고른 날짜(YYYY-MM-DD). 처음엔 오늘 — 서재에 들어오면 오늘 칸이 바로 열려 있다
  const [selectedDate, setSelectedDate] = useState<string | null>(today);

  const month = buildCalendarMonth(books, view.year, view.month);
  const days = month.weeks.flat().filter((d): d is CalendarDay => !!d);
  // 달을 넘기면: 고른 날이 이 달에 없으면 오늘(이 달이면), 그것도 아니면 아무 날도 안 고른 상태
  const selected =
    days.find((d) => d.date === selectedDate) ??
    days.find((d) => d.date === today) ??
    null;
  // 날짜 → 그날 펼친 문장. 하루 한 줄이라 Map 하나로 찾는다
  const sentenceByDate = new Map(
    sentenceDraws.map((sentence) => [sentence.draw_date, sentence])
  );
  const selectedSentence = selected
    ? sentenceByDate.get(selected.date)
    : undefined;
  const { summary } = month;

  return (
    <section
      id='reading-calendar'
      className='scroll-mt-24 rounded-2xl border border-line-soft bg-card p-5'
    >
      <div className='flex items-center justify-between'>
        <h2 className='text-base font-bold text-text-strong'>독서 캘린더</h2>
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

      {/* 넓은 화면: 왼쪽 달력 + 오른쪽 그날 패널 / 폰: 달력 아래에 패널 (HJ B안, 2026-11-10) */}
      <div className='mt-3 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]'>
        <div className='min-w-0'>
          {/* 월 칩 — 공개 완독이 있는 달에 점. 권수는 아래 월별 차트가 보여준다 */}
          <div className='grid grid-cols-12 gap-0.5'>
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
                className={
                  i === 0 ? 'text-rank-up' : i === 6 ? 'text-primary' : ''
                }
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
                    className='h-14 border-t border-line-soft sm:h-16 lg:h-20'
                  />
                );
              }
              const count = day.completions.length;
              const startCount = day.readingStarts.length;
              // 완독 표지 뒤에 읽기 시작한 책 표지를 이어 쌓는다(점선 테두리로 구분)
              const covers = [
                ...day.completions.map(({ book, colorIndex }) => ({
                  book,
                  outline:
                    colorIndex !== null
                      ? `1.5px solid ${CHART_COLORS[colorIndex]}`
                      : undefined,
                })),
                ...day.readingStarts.map((book) => ({
                  book,
                  outline: '1.5px dashed var(--primary)',
                })),
              ];
              const sentence = sentenceByDate.get(day.date);
              const label = [
                count > 0 && `${count}권 완독`,
                startCount > 0 && `${startCount}권 읽기 시작`,
                sentence && '오늘의 문장',
              ]
                .filter(Boolean)
                .join(', ');
              const isToday = day.date === today;
              const isSelected = day.date === selected?.date;
              return (
                <button
                  key={day.date}
                  type='button'
                  // 책이 없어도 문장을 펼친 날·오늘(펼치기 자리)은 누를 수 있다
                  disabled={covers.length === 0 && !sentence && !isToday}
                  onClick={() => setSelectedDate(day.date)}
                  aria-pressed={isSelected}
                  aria-label={`${view.month}월 ${day.day}일${isToday ? ', 오늘' : ''}${label ? `, ${label}` : ''}`}
                  className={`relative flex h-14 flex-col items-start justify-start border-t border-line-soft px-1 pt-0.5 text-left text-xs text-text-subtle enabled:hover:bg-sunken sm:h-16 lg:h-20 ${
                    isSelected
                      ? 'z-10 rounded-md bg-sunken ring-2 ring-primary'
                      : ''
                  }`}
                >
                  <span
                    className={
                      isToday
                        ? 'inline-flex size-5 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground'
                        : ''
                    }
                  >
                    {day.day}
                  </span>

                  {/* 오늘의 문장을 펼친 날 — 날짜 옆 작은 책갈피(서재 책갈피와 같은 민트) */}
                  {sentence && (
                    <Bookmark
                      aria-hidden
                      className='absolute right-1 top-1 size-3 fill-current text-[var(--teal-500)]'
                    />
                  )}

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

                  {/* 완독·읽기 시작 표지 — 같은 날 여러 권이면 겹쳐 쌓고 +N */}
                  {covers.length > 0 && (
                    <span className='absolute bottom-1.5 right-1 flex'>
                      {covers
                        .slice(0, MAX_COVERS)
                        .map(({ book, outline }, i) => (
                          <span
                            key={book.id}
                            className={`relative block h-[38px] w-[26px] lg:h-[50px] lg:w-[34px] ${i > 0 ? '-ml-4 lg:-ml-5' : ''} ${
                              book.is_public ? '' : 'opacity-50'
                            }`}
                            style={{ outline }}
                          >
                            <BookCover
                              {...toCoverSource(book)}
                              title={book.title}
                              decorative
                              size='fill'
                              sizes='34px'
                              // 작은 칸에 겹쳐 쌓는 표지 — 칸 모양이 그림이라 꽉 채운다
                              fit='cover'
                            />
                          </span>
                        ))}
                      {covers.length > MAX_COVERS && (
                        <span className='ml-0.5 self-end text-xs font-medium text-text-body'>
                          +{covers.length - MAX_COVERS}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className='mt-3 text-xs text-text-subtle'>
            {view.month}월 <b className='text-text-strong'>{summary.count}권</b>{' '}
            완독
            {summary.pages > 0 && ` · ${summary.pages.toLocaleString()}쪽`}
            {isOwner &&
              summary.privateCount > 0 &&
              ` · 그중 나만 보기 ${summary.privateCount}권`}
          </p>
        </div>

        <DayPanel
          day={selected}
          month={view.month}
          today={today}
          sentence={selectedSentence}
          todaySlot={todaySlot}
          footerSlot={footerSlot}
          bookHref={bookHref}
        />
      </div>
    </section>
  );
};

type DayPanelProps = {
  day: CalendarDay | null;
  month: number;
  today: string;
  sentence: DailySentence | undefined;
  todaySlot?: ReactNode;
  footerSlot?: ReactNode;
  bookHref: (book: Book) => string;
};

/**
 * 고른 날의 패널 — 예전엔 날짜를 누르면 팝업(Dialog)이 떴는데, 캘린더를 서재의 "오늘 허브"로
 * 키우면서(HJ B안, 2026-11-10) 옆(폰은 아래)에 늘 펼쳐 두는 칸이 됐다.
 * 오늘이면 펼치기 카드(todaySlot), 지난날이면 그날 펼친 문장을 보여 준다.
 */
const DayPanel = ({
  day,
  month,
  today,
  sentence,
  todaySlot,
  footerSlot,
  bookHref,
}: DayPanelProps) => {
  const isToday = day?.date === today;
  const hasBooks =
    !!day && (day.completions.length > 0 || day.readingStarts.length > 0);
  const showTodaySlot = isToday && !!todaySlot;

  return (
    <aside
      aria-live='polite'
      className='flex min-w-0 flex-col gap-4 rounded-xl bg-sunken p-4'
    >
      <h3 className='text-sm font-bold text-text-strong'>
        {day
          ? `${month}월 ${day.day}일${isToday ? ' · 오늘' : ''}`
          : `${month}월`}
      </h3>

      {!day && (
        <p className='text-sm text-text-subtle'>
          날짜를 누르면 그날 읽은 책과 문장이 여기 보여요.
        </p>
      )}

      {showTodaySlot && todaySlot}

      {/* 지난날(또는 오늘인데 펼치기 카드가 없을 때) 펼친 문장 */}
      {!showTodaySlot && sentence && (
        <div>
          <p className='text-xs font-medium text-text-subtle'>오늘의 문장</p>
          <div className='mt-2 flex gap-3'>
            {sentence.cover_image && (
              <BookCover
                src={sentence.cover_image}
                title={sentence.book_title}
                size='xs'
                small
                decorative
              />
            )}
            <div className='min-w-0'>
              <blockquote className='whitespace-pre-wrap break-keep text-sm font-medium leading-relaxed text-text-strong'>
                {sentence.text}
              </blockquote>
              <p className='mt-1 text-xs text-text-subtle'>
                {formatSentenceSource(sentence)}
              </p>
            </div>
          </div>
        </div>
      )}

      {day && day.completions.length > 0 && (
        <CalendarBookList
          heading='완독한 책'
          books={day.completions.map(({ book }) => book)}
          bookHref={bookHref}
          trailing={(book) =>
            isRated(book.rating)
              ? book.is_life_book
                ? '인생책'
                : `${book.rating}점`
              : null
          }
        />
      )}
      {day && day.readingStarts.length > 0 && (
        <CalendarBookList
          heading='읽기 시작한 책'
          books={day.readingStarts}
          bookHref={bookHref}
          // 기간은 막대 대신 글로 — 오래 읽는 책이 달력을 덮지 않게
          trailing={() => `읽는 중 · ${readingDayCount(day.date, today)}일째`}
        />
      )}

      {day && !hasBooks && !sentence && !showTodaySlot && (
        <p className='text-sm text-text-subtle'>
          {isToday ? '오늘은 아직 기록이 없어요.' : '이날은 기록이 없어요.'}
        </p>
      )}

      {footerSlot && (
        <div className='mt-auto border-t border-line-soft pt-3'>
          {footerSlot}
        </div>
      )}
    </aside>
  );
};

type CalendarBookListProps = {
  heading: string;
  books: Book[];
  bookHref: (book: Book) => string;
  /** 줄 오른쪽 끝 — 점수·'N일째' 등 */
  trailing: (book: Book) => string | null;
};

const CalendarBookList = ({
  heading,
  books,
  bookHref,
  trailing,
}: CalendarBookListProps) => (
  <div>
    <h4 className='text-xs font-medium text-text-subtle'>{heading}</h4>
    <ul className='divide-y divide-line-soft'>
      {books.map((book) => {
        const right = trailing(book);
        return (
          <li key={book.id}>
            <Link
              // 목록 링크는 미리 불러오지 않는다 (Vercel CPU — 00_docs 남은 작업 참고)
              prefetch={false}
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
              {right && (
                <span className='text-sm font-medium text-text-body'>
                  {right}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  </div>
);
