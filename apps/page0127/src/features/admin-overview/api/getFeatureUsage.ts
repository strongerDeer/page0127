import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import {
  getAdminUserIds,
  toInFilter,
} from '@/shared/lib/admin/getAdminUserIds';
import { toKstDateKey } from '@/shared/lib/date';

import {
  type SentenceUsage,
  summarizeSentence,
  summarizeTyping,
  type TypingUsage,
} from '../lib/featureUsage';
import { kstDateToUtcEnd, kstDateToUtcStart } from '../lib/period';
import { fetchAll } from './fetchAll';

import type { DateRange } from '@/shared/lib/admin/dateRange';

export type FeatureUsage = {
  /** null = 조회 실패("0건"과 구분) */
  sentence: SentenceUsage | null;
  typing: TypingUsage | null;
};

/**
 * 오늘의 문장·온라인 필사 DB 숫자. 운영자·체험·테스트 계정은 뺀다(홈 DAU 와 같은 사람들).
 * 비회원 필사 기록은 계정이 없어 운영자 제외를 할 수 없다 — 내가 비회원으로 올린 기록도 섞인다.
 */
export async function getFeatureUsage(range: DateRange): Promise<FeatureUsage> {
  await assertAdmin();
  const supabase = createAdminClient();
  const adminIds = await getAdminUserIds();
  const notAdmin = adminIds.length > 0 ? toInFilter(adminIds) : null;
  const gte = kstDateToUtcStart(range.from);
  const lt = kstDateToUtcEnd(range.to);

  const [draws, pages, guests, optIn] = await Promise.all([
    fetchAll<{ user_id: string; draw_date: string }>((from, to) => {
      let q = supabase
        .from('sentence_draws')
        .select('user_id, draw_date')
        .gte('draw_date', range.from)
        .lte('draw_date', range.to);
      if (notAdmin) q = q.not('user_id', 'in', notAdmin);
      return q.order('draw_date').order('user_id').range(from, to);
    }, 'sentence_draws'),
    fetchAll<{ user_id: string; first_completed_at: string }>((from, to) => {
      let q = supabase
        .from('typing_records')
        .select('user_id, first_completed_at')
        .gte('first_completed_at', gte)
        .lt('first_completed_at', lt);
      if (notAdmin) q = q.not('user_id', 'in', notAdmin);
      return q
        .order('first_completed_at')
        .order('user_id')
        .order('page_key')
        .range(from, to);
    }, 'typing_records'),
    fetchAll<{ guest_id: string }>(
      (from, to) =>
        supabase
          .from('typing_guest_scores')
          .select('guest_id')
          .gte('created_at', gte)
          .lt('created_at', lt)
          .order('created_at')
          .order('guest_id')
          .order('page_key')
          .range(from, to),
      'typing_guest_scores'
    ),
    (async () => {
      let q = supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('typing_rank_opt_in', true);
      if (notAdmin) q = q.not('id', 'in', notAdmin);
      const { count, error } = await q;
      if (error) {
        console.error('[admin] 필사 순위 참여 수 조회 실패:', error.message);
        return null;
      }
      return count ?? 0;
    })(),
  ]);

  return {
    sentence: draws ? summarizeSentence(draws, range) : null,
    typing:
      pages && guests && optIn !== null
        ? summarizeTyping(
            pages.map((p) => ({
              user_id: p.user_id,
              dateKey: toKstDateKey(new Date(p.first_completed_at)),
            })),
            guests,
            optIn,
            range
          )
        : null,
  };
}
