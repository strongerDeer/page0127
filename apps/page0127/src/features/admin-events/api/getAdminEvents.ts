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
  return data.map((e) => ({
    id: e.id,
    date: e.event_date,
    title: e.title,
    note: e.note,
  }));
}
