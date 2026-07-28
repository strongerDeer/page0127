import { toKstDateKey } from '@/shared/lib/date';

import { isWithinWeek, toKstWeekRange } from './kstWeek';

import type { RecapBook, RecapCard } from '../model/types';

/** 몇 해 전까지 거슬러 볼 것인가. 이 서비스가 담는 독서 이력의 현실적 상한 */
const MAX_YEARS_BACK = 10;

/** 기념일 앞뒤 며칠까지를 "같은 주"로 볼 것인가 */
const ANNIVERSARY_WINDOW_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 완독일이 있는 책. filter 로 좁히면 completed_date 가 string 으로 확정된다 */
type CompletedBook = RecapBook & { completed_date: string };

const hasCompletedDate = (book: RecapBook): book is CompletedBook =>
  book.completed_date !== null;

/**
 * 같은 값끼리는 id 오름차순.
 *
 * 장식이 아니다. 이 꼬리표가 없으면 DB가 돌려주는 행 순서에 대표 책이 좌우돼
 * "같은 입력 → 같은 출력"이 깨진다.
 */
const byIdAsc = (a: RecapBook, b: RecapBook): number =>
  a.id.localeCompare(b.id);

const daysBetween = (aKey: string, bKey: string): number =>
  Math.round(
    (Date.parse(`${aKey}T00:00:00Z`) - Date.parse(`${bKey}T00:00:00Z`)) /
      MS_PER_DAY
  );

/**
 * 날짜 키에서 연도만 뒤로 민다.
 *
 * 2월 29일은 평년에 3월 1일로 넘어간다(JS 기본 동작). 기념일 창이 ±7일이라
 * 하루 밀린 것은 결과를 바꾸지 않으므로 그대로 둔다.
 */
const shiftYearsBack = (dateKey: string, yearsBack: number): string => {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() - yearsBack);
  return date.toISOString().slice(0, 10);
};

/** 정렬된 목록을 대표 1권 + 나머지로 가른다 */
const split = (sorted: RecapBook[]) => ({
  lead: sorted[0],
  others: sorted.slice(1),
});

/**
 * 이번 주에 할 말이 있는 카드 1장을 고른다. 없으면 null.
 *
 * 우선순위는 고정이고 무작위가 없다 — 같은 주에 홈을 몇 번 새로고침해도 같은
 * 카드가 나온다.
 *
 * ⚠️ 지금은 사용자의 책 전량을 받아 여기서 거른다. 157권 기준 30KB 라 문제없지만,
 *    한 사람이 2000권을 넘으면 DB 쪽 계산(RPC)으로 옮긴다.
 */
export const selectRecapCard = (
  books: RecapBook[],
  now: Date
): RecapCard | null => {
  const week = toKstWeekRange(now);

  // ① 이번 주의 나 — 완독이 담기보다 먼저다. 끝낸 것이 회상할 거리가 더 크다
  const completedThisWeek = books
    .filter(hasCompletedDate)
    .filter((book) => isWithinWeek(book.completed_date, week));

  if (completedThisWeek.length > 0) {
    const sorted = [...completedThisWeek].sort(
      (a, b) =>
        b.completed_date.localeCompare(a.completed_date) || byIdAsc(a, b)
    );
    return { kind: 'this-week', variant: 'completed', ...split(sorted) };
  }

  const addedThisWeek = books.filter((book) =>
    isWithinWeek(toKstDateKey(new Date(book.created_at)), week)
  );

  if (addedThisWeek.length > 0) {
    const sorted = [...addedThisWeek].sort(
      (a, b) => b.created_at.localeCompare(a.created_at) || byIdAsc(a, b)
    );
    return { kind: 'this-week', variant: 'added', ...split(sorted) };
  }

  // ② 그 해, 이 주의 나 — 가장 가까운 해부터 보고, 걸리면 거기서 멈춘다
  const todayKey = toKstDateKey(now);
  const completed = books.filter(hasCompletedDate);

  for (let yearsAgo = 1; yearsAgo <= MAX_YEARS_BACK; yearsAgo += 1) {
    const anniversaryKey = shiftYearsBack(todayKey, yearsAgo);

    const nearAnniversary = completed.filter(
      (book) =>
        Math.abs(daysBetween(book.completed_date, anniversaryKey)) <=
        ANNIVERSARY_WINDOW_DAYS
    );

    if (nearAnniversary.length === 0) continue;

    const sorted = [...nearAnniversary].sort((a, b) => {
      const gap =
        Math.abs(daysBetween(a.completed_date, anniversaryKey)) -
        Math.abs(daysBetween(b.completed_date, anniversaryKey));
      return gap !== 0 ? gap : byIdAsc(a, b);
    });

    return { kind: 'years-ago', yearsAgo, ...split(sorted) };
  }

  // ③ 아직 읽는 중 — 가장 오래 놓여 있는 것이 회상할 거리가 크다
  const reading = books.filter((book) => book.status === 'reading');

  if (reading.length > 0) {
    const sorted = [...reading].sort(
      (a, b) => a.created_at.localeCompare(b.created_at) || byIdAsc(a, b)
    );
    return { kind: 'still-reading', ...split(sorted) };
  }

  // ④ 할 말이 없으면 침묵한다. "이번 주 0권" 같은 문구를 만들지 않는다
  return null;
};
