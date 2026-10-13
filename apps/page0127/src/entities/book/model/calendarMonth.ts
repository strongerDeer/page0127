import type { Book } from '../types';

/**
 * 독서 달력 한 달치 계산 (순수 함수).
 *
 * 학습 포인트:
 * - 날짜는 'YYYY-MM-DD' 문자열 그대로 비교한다. 사전순 비교가 곧 날짜순이라
 *   Date 객체를 만들 필요가 없고, 타임존 때문에 하루가 밀릴 일도 없다.
 * - 기간 막대의 줄(lane) 배정은 "구간 스케줄링" 그리디:
 *   시작일 순으로 보며, 앞 책이 이미 끝난 가장 낮은 줄에 넣는다.
 */
export const MAX_LANES = 3;
/** 기간 막대 색 수 — --chart-1 ~ --chart-7 */
const COLOR_COUNT = 7;

export type CalendarCompletion = {
  book: Book;
  /** 같은 책의 기간 막대 색 — 시작일이 없어 막대가 없으면 null */
  colorIndex: number | null;
};

export type CalendarRangeSegment = {
  book: Book;
  lane: number;
  colorIndex: number;
  /** 실제 시작일인 칸 */
  isStart: boolean;
  /** 실제 끝(완독일·오늘)인 칸 */
  isEnd: boolean;
};

export type CalendarDay = {
  date: string;
  day: number;
  completions: CalendarCompletion[];
  /** 그릴 줄만 (lane < MAX_LANES) */
  ranges: CalendarRangeSegment[];
  /** 줄이 모자라 못 그린 기간 수 */
  overflow: number;
};

export type CalendarMonth = {
  year: number;
  month: number;
  /** 일요일 시작, 7칸씩 */
  weeks: (CalendarDay | null)[][];
  summary: { publicCount: number; publicPages: number; privateCount: number };
  /** 그 해 공개 완독이 있는 달 (1~12) */
  activeMonths: number[];
};

type CompletedBook = Book & { completed_date: string };

const pad = (n: number) => String(n).padStart(2, '0');
const toDate = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const daysInMonth = (y: number, m: number) =>
  new Date(Date.UTC(y, m, 0)).getUTCDate();

const isCompleted = (book: Book): book is CompletedBook =>
  book.status === 'completed' && book.completed_date !== null;

type Range = {
  book: Book;
  start: string;
  end: string;
  lane: number;
  colorIndex: number;
};

/** 이 달에 걸치는 기간(시작일이 있는 책만)과 줄 배정 */
const layoutRanges = (
  books: Book[],
  monthStart: string,
  monthEnd: string,
  today: string
): Range[] => {
  const candidates = books
    .flatMap((book) => {
      if (!book.start_date) return [];
      const end =
        book.status === 'completed'
          ? book.completed_date
          : book.status === 'reading'
            ? today
            : null;
      // 읽고 싶어요·끝 날짜 없음·시작>끝(입력 실수)은 그리지 않는다
      if (!end || book.start_date > end) return [];
      if (end < monthStart || book.start_date > monthEnd) return [];
      return [{ book, start: book.start_date, end }];
    })
    .sort(
      (a, b) =>
        a.start.localeCompare(b.start) || a.book.id.localeCompare(b.book.id)
    );

  const laneEnds: string[] = [];
  return candidates.map((range, index) => {
    let lane = laneEnds.findIndex((laneEnd) => laneEnd < range.start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = range.end;
    return { ...range, lane, colorIndex: index % COLOR_COUNT };
  });
};

export const buildCalendarMonth = (
  books: Book[],
  year: number,
  month: number,
  today: string
): CalendarMonth => {
  const total = daysInMonth(year, month);
  const monthStart = toDate(year, month, 1);
  const monthEnd = toDate(year, month, total);
  const ranges = layoutRanges(books, monthStart, monthEnd, today);
  const colorOf = new Map(ranges.map((r) => [r.book.id, r.colorIndex]));
  const completed = books.filter(isCompleted);

  const days: CalendarDay[] = Array.from({ length: total }, (_, i) => {
    const date = toDate(year, month, i + 1);
    const active = ranges.filter((r) => r.start <= date && date <= r.end);
    return {
      date,
      day: i + 1,
      completions: completed
        .filter((book) => book.completed_date === date)
        .map((book) => ({ book, colorIndex: colorOf.get(book.id) ?? null })),
      ranges: active
        .filter((r) => r.lane < MAX_LANES)
        .sort((a, b) => a.lane - b.lane)
        .map((r) => ({
          book: r.book,
          lane: r.lane,
          colorIndex: r.colorIndex,
          isStart: r.start === date,
          isEnd: r.end === date,
        })),
      overflow: active.filter((r) => r.lane >= MAX_LANES).length,
    };
  });

  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const cells: (CalendarDay | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) =>
    cells.slice(w * 7, w * 7 + 7)
  );

  const inMonth = completed.filter(
    (book) =>
      book.completed_date >= monthStart && book.completed_date <= monthEnd
  );
  const publicInMonth = inMonth.filter((book) => book.is_public);

  const activeMonths = Array.from(
    new Set(
      completed
        .filter(
          (book) => book.is_public && book.completed_date.startsWith(`${year}-`)
        )
        .map((book) => Number(book.completed_date.slice(5, 7)))
    )
  ).sort((a, b) => a - b);

  return {
    year,
    month,
    weeks,
    summary: {
      publicCount: publicInMonth.length,
      publicPages: publicInMonth.reduce(
        (sum, book) => sum + (book.page_count ?? 0),
        0
      ),
      privateCount: inMonth.length - publicInMonth.length,
    },
    activeMonths,
  };
};

/** 처음 열 달 — 올해면 이번 달, 지난해면 그 해 마지막 완독 달(없으면 12월) */
export const getInitialCalendarMonth = (
  books: Book[],
  year: number,
  today: string
): number => {
  if (Number(today.slice(0, 4)) === year) return Number(today.slice(5, 7));
  const months = books
    .filter(isCompleted)
    .filter((book) => book.completed_date.startsWith(`${year}-`))
    .map((book) => Number(book.completed_date.slice(5, 7)));
  return months.length > 0 ? Math.max(...months) : 12;
};
