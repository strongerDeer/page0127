import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import { SLIDE_EVENT_COLUMNS, type SlideEvent } from '../lib/slideEvents';

/** 어드민 화면이 읽는 수정 기록 수 — "최근 기록"과 배너별 기록을 이 안에서 나눠 쓴다 */
const EVENTS_LIMIT = 200;

/**
 * 배너 수정 기록(hero_slide_events)을 최신순으로 읽는다.
 * 기록을 못 읽어도 배너 관리는 돼야 하므로 실패하면 빈 목록(서버 로그만 남김).
 */
export async function getSlideEvents(): Promise<SlideEvent[]> {
  await assertAdmin();
  const { data, error } = await createAdminClient()
    .from('hero_slide_events')
    .select(SLIDE_EVENT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(EVENTS_LIMIT);
  if (error) {
    console.error('[admin] 배너 수정 기록 조회 실패:', error.message);
    return [];
  }
  return (data as SlideEvent[] | null) ?? [];
}
