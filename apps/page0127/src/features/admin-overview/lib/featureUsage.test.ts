import { describe, expect, it } from 'vitest';

import { summarizeSentence, summarizeTyping } from './featureUsage';

import type { DateRange } from '@/shared/lib/admin/dateRange';

const range: DateRange = {
  preset: 'custom',
  from: '2026-11-25',
  to: '2026-11-26',
  days: 2,
  includesToday: true,
  label: '',
};

describe('featureUsage', () => {
  it('오늘의 문장: 뽑기 수·사람 수·날짜별(0인 날 포함)', () => {
    const s = summarizeSentence(
      [
        { user_id: 'a', draw_date: '2026-11-26' },
        { user_id: 'b', draw_date: '2026-11-26' },
        { user_id: 'a', draw_date: '2026-11-26' },
      ],
      range
    );
    expect(s.draws).toBe(3);
    expect(s.drawers).toBe(2);
    expect(s.daily.map((p) => p.count)).toEqual([0, 3]);
  });

  it('필사: 회원 쪽·사람, 비회원 기록·브라우저 수', () => {
    const t = summarizeTyping(
      [
        { user_id: 'a', dateKey: '2026-11-25' },
        { user_id: 'a', dateKey: '2026-11-26' },
      ],
      [{ guest_id: 'g1' }, { guest_id: 'g1' }, { guest_id: 'g2' }],
      4,
      range
    );
    expect(t).toMatchObject({
      newPages: 2,
      writers: 1,
      guestScores: 3,
      guestWriters: 2,
      rankOptIn: 4,
    });
    expect(t.daily.map((p) => p.count)).toEqual([1, 1]);
  });
});
