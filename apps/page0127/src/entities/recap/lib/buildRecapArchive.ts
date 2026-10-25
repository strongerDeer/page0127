import { toKstDateKey } from '@/shared/lib/date';

import { isWithinWeek, toKstWeekRange } from './kstWeek';

import type { RecapBook } from '../model/types';
import type { KstWeekRange } from './kstWeek';

/** 아카이브가 거슬러 보는 주 수. 이번 주는 서재 회상 카드가 맡으므로 지난주부터 센다 */
export const RECAP_ARCHIVE_WEEKS = 12;

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** 지난 한 주의 기록 */
export type RecapWeek = KstWeekRange & {
  /** 몇 주 전인가 (1 = 지난주) */
  weeksAgo: number;
  /** 그 주에 완독한 책 — 완독일 최신순 */
  completed: RecapBook[];
  /** 그 주에 담은 책 — 같은 주에 완독한 책은 completed 에만 둔다 */
  added: RecapBook[];
};

/** 같은 값끼리는 id 오름차순 — selectRecapCard 와 같은 이유(같은 입력 → 같은 출력) */
const byIdAsc = (a: RecapBook, b: RecapBook): number =>
  a.id.localeCompare(b.id);

/**
 * 지난 N주의 회상 — 주마다 완독한 책과 담은 책을 모은다.
 *
 * 저장하는 것이 없다. 회상은 책 기록(완독일·담은 날)에서 다시 계산되므로, 이 화면을
 * 늦게 만들어도 그동안의 주가 다 복원된다.
 *
 * - 아무 일 없던 주는 빼고 돌려준다. "0권" 줄을 늘어놓지 않는다(WeeklyRecapCard 와 같은 원칙).
 * - 완독 연도만 아는 책(completed_year)은 날짜가 없어 담은 주에 '담음'으로만 잡힌다.
 * - 'still-reading'·'years-ago' 는 넣지 않는다. 앞의 것은 지금 상태라 지난 주와 무관하고,
 *   뒤의 것은 그 주에 한 일이 아니라 그 주에 떠올릴 거리다.
 */
export const buildRecapArchive = (
  books: RecapBook[],
  now: Date,
  weeks = RECAP_ARCHIVE_WEEKS
): RecapWeek[] => {
  const archive: RecapWeek[] = [];

  for (let weeksAgo = 1; weeksAgo <= weeks; weeksAgo += 1) {
    // KST 는 일광절약시간이 없어서 7일씩 빼도 주 경계가 어긋나지 않는다
    const week = toKstWeekRange(
      new Date(now.getTime() - weeksAgo * MS_PER_WEEK)
    );

    const completed = books
      .filter(
        (book): book is RecapBook & { completed_date: string } =>
          book.completed_date !== null &&
          isWithinWeek(book.completed_date, week)
      )
      .sort(
        (a, b) =>
          b.completed_date.localeCompare(a.completed_date) || byIdAsc(a, b)
      );

    const completedIds = new Set(completed.map((book) => book.id));
    const added = books
      .filter(
        (book) =>
          !completedIds.has(book.id) &&
          isWithinWeek(toKstDateKey(new Date(book.created_at)), week)
      )
      .sort(
        (a, b) => b.created_at.localeCompare(a.created_at) || byIdAsc(a, b)
      );

    if (completed.length === 0 && added.length === 0) continue;

    archive.push({ ...week, weeksAgo, completed, added });
  }

  return archive;
};

/** 'YYYY-MM-DD' 두 개 → '10월 13일 – 19일' / '9월 29일 – 10월 5일'. 올해가 아니면 연도를 붙인다 */
export const toWeekRangeLabel = (
  { startKey, endKey }: KstWeekRange,
  currentYear: number
): string => {
  const [startYear, startMonth, startDay] = startKey.split('-').map(Number);
  const [endYear, endMonth, endDay] = endKey.split('-').map(Number);

  const start = `${startYear !== currentYear ? `${startYear}년 ` : ''}${startMonth}월 ${startDay}일`;
  if (startYear !== endYear)
    return `${start} – ${endYear}년 ${endMonth}월 ${endDay}일`;
  if (startMonth !== endMonth) return `${start} – ${endMonth}월 ${endDay}일`;
  return `${start} – ${endDay}일`;
};

/** 1 → '지난주', n → 'n주 전' */
export const toWeeksAgoLabel = (weeksAgo: number): string =>
  weeksAgo === 1 ? '지난주' : `${weeksAgo}주 전`;
