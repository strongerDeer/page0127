import { toKstDateKey } from '@/shared/lib/date';

import { readingDayCount, readingSince } from './readingSince';

/** 이 날수(시작한 날 = 1일째)를 넘기면 '오래 읽는 중'으로 보고 한 번 알린다 */
export const READING_REMINDER_DAYS = 14;

/** 오래 읽는 중인지 — 서재 '지금 읽는 중' 넛지와 알림 크론이 같은 기준을 쓴다 */
export const isLongReading = (dayCount: number): boolean =>
  dayCount > READING_REMINDER_DAYS;

export type ReminderCandidate = {
  id: string;
  user_id: string;
  title: string;
  start_date: string | null;
  created_at: string;
  reading_reminded_at: string | null;
};

export type DueReminder = {
  book: ReminderCandidate;
  dayCount: number;
};

/**
 * 오늘 알림을 보낼 읽는 중인 책 (순수 함수).
 *
 * 이미 알린 책은 건너뛴다. 단, 알린 날이 지금 시작일보다 앞이면(다시 읽기 시작해
 * 시작일을 고쳤다) 새 독서로 보고 다시 알린다.
 */
export const selectDueReminders = (
  books: ReminderCandidate[],
  today: string
): DueReminder[] =>
  books.flatMap((book) => {
    const since = readingSince(book);
    const dayCount = readingDayCount(since, today);
    if (!isLongReading(dayCount)) return [];
    if (
      book.reading_reminded_at &&
      toKstDateKey(new Date(book.reading_reminded_at)) >= since
    ) {
      return [];
    }
    return [{ book, dayCount }];
  });
