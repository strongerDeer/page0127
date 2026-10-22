import { describe, expect, it } from 'vitest';

import {
  READING_REMINDER_DAYS,
  type ReminderCandidate,
  selectDueReminders,
} from './readingReminder';

const TODAY = '2026-10-22';
const candidate = (
  overrides: Partial<ReminderCandidate> = {}
): ReminderCandidate => ({
  id: crypto.randomUUID(),
  user_id: 'user-id',
  title: '테스트 책',
  start_date: null,
  created_at: '2026-10-01T00:00:00Z',
  reading_reminded_at: null,
  ...overrides,
});

describe('selectDueReminders', () => {
  it(`${READING_REMINDER_DAYS}일째까지는 알리지 않고, 다음 날부터 알린다`, () => {
    const day14 = candidate({ start_date: '2026-10-09' });
    const day15 = candidate({ start_date: '2026-10-08' });
    const due = selectDueReminders([day14, day15], TODAY);
    expect(due).toEqual([{ book: day15, dayCount: 15 }]);
  });

  it('시작일이 없으면 담은 날부터 센다', () => {
    const book = candidate({ created_at: '2026-10-01T00:00:00Z' });
    expect(selectDueReminders([book], TODAY)[0]?.dayCount).toBe(22);
  });

  it('이미 알린 책은 다시 알리지 않는다', () => {
    const book = candidate({
      start_date: '2026-09-01',
      reading_reminded_at: '2026-09-16T00:00:00Z',
    });
    expect(selectDueReminders([book], TODAY)).toEqual([]);
  });

  it('알린 뒤 시작일을 새로 잡으면(다시 읽기) 다시 알린다', () => {
    const book = candidate({
      start_date: '2026-10-01',
      reading_reminded_at: '2026-08-20T00:00:00Z',
    });
    expect(selectDueReminders([book], TODAY)).toHaveLength(1);
  });
});
