import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import type { DateRange } from '@/shared/lib/admin/dateRange';

export type AdminEvent = {
  id: string;
  /** KST 'YYYY-MM-DD' */
  date: string;
  title: string;
  note: string | null;
};

type Row = {
  id: string;
  event_date: string;
  title: string;
  note: string | null;
};

const toEvent = (e: Row): AdminEvent => ({
  id: e.id,
  date: e.event_date,
  title: e.title,
  note: e.note,
});

/**
 * 기간 안의 운영 기록(인스타 공유·기능 출시 등). 날짜 오름차순.
 * 실패하면 null — "기록 없음"과 구별해 화면이 안내를 띄운다.
 */
export async function getAdminEvents(
  range: DateRange
): Promise<AdminEvent[] | null> {
  await assertAdmin();
  const { data, error } = await createAdminClient()
    .from('admin_events')
    .select('id, event_date, title, note')
    .gte('event_date', range.from)
    .lte('event_date', range.to)
    .order('event_date')
    .order('created_at');
  if (error) {
    console.error('[admin] 운영 기록 조회 실패:', error.message);
    return null;
  }
  return (data as Row[]).map(toEvent);
}

/**
 * 최근에 **적은 순서**로 몇 개 — 고른 기간 밖 날짜로 기록하면 목록에서 걸러져
 * "저장이 안 됐다"로 보인다(2026-10-31, 기간 10/30까지에 10/31 기록). 그래서 패널 아래에
 * 기간 밖 최근 기록을 따로 보여 저장됐음을 확인시킨다.
 */
export async function getRecentAdminEvents(limit = 3): Promise<AdminEvent[]> {
  await assertAdmin();
  const { data, error } = await createAdminClient()
    .from('admin_events')
    .select('id, event_date, title, note')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[admin] 최근 운영 기록 조회 실패:', error.message);
    return [];
  }
  return (data as Row[]).map(toEvent);
}
