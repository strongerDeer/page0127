import { toKstDateKey } from '@/shared/lib/date';

import type { Book } from '../types';

/**
 * 읽는 중인 책의 시작일 'YYYY-MM-DD'.
 *
 * 시작일은 옵션이라 비어 있는 책이 많다 → 서재에 담은 날(created_at, KST)을 대신 쓴다.
 * '언제부터 읽었나'를 모르는 책도 달력·N일째 계산에서 빠지지 않게 하기 위해서다.
 */
export const readingSince = (
  book: Pick<Book, 'start_date' | 'created_at'>
): string => book.start_date ?? toKstDateKey(new Date(book.created_at));

/**
 * 시작일부터 오늘까지 며칠째인지 — 시작한 날이 1일째.
 * 시작일이 미래(입력 실수)여도 0·음수를 보여 주지 않도록 1로 막는다.
 */
export const readingDayCount = (since: string, today: string): number => {
  // 'YYYY-MM-DD' 를 UTC 자정으로 읽으면 타임존과 무관하게 날짜 차이만 남는다
  const diff = Date.parse(today) - Date.parse(since);
  return Math.max(1, Math.floor(diff / 86_400_000) + 1);
};
