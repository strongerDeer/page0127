import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import {
  getAdminUserIds,
  toInFilter,
} from '@/shared/lib/admin/getAdminUserIds';
import { toKstDateKey } from '@/shared/lib/date';

import {
  type DrawRow,
  type DrawStats,
  shiftDate,
  STATS_WINDOW_DAYS,
  summarizeDraws,
} from '../lib/drawStats';

// PostgREST 는 한 번에 최대 1,000행 — 넘으면 에러 없이 잘려서 끝까지 넘겨 읽는다
const PAGE = 1000;

/**
 * 최근 4주 뽑기 기록 → "뽑기를 쓰나?" 숫자.
 * 운영자·체험·테스트 계정은 뺀다(홈 DAU 와 같은 사람들을 센다).
 * 28일이면 비교용 "그 전 7일"(7+7 ≤ 28)까지 들어간다.
 * 실패하면 null — "아무도 안 뽑음(0)"과 구분한다.
 */
export async function getSentenceDrawStats(
  now = new Date()
): Promise<DrawStats | null> {
  await assertAdmin();
  const supabase = createAdminClient();
  const today = toKstDateKey(now);
  const since = shiftDate(today, -(STATS_WINDOW_DAYS - 1));
  const excluded = await getAdminUserIds();
  // 빈 목록으로 not in () 을 보내면 PostgREST 가 문법 오류를 낸다
  const notAdmin = excluded.length > 0 ? toInFilter(excluded) : null;

  const rows: DrawRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from('sentence_draws')
      .select('user_id, draw_date, sentence_id')
      .gte('draw_date', since)
      .lte('draw_date', today);
    if (notAdmin) q = q.not('user_id', 'in', notAdmin);
    const { data, error } = await q
      .order('draw_date')
      .order('user_id')
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('[admin] 문장 뽑기 기록 조회 실패:', error.message);
      return null;
    }
    rows.push(...((data ?? []) as DrawRow[]));
    if (!data || data.length < PAGE) break;
  }
  return summarizeDraws(rows, today);
}
