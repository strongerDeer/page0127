import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import {
  getAdminUserIds,
  toInFilter,
} from '@/shared/lib/admin/getAdminUserIds';
import { toKstDateKey } from '@/shared/lib/date';

import { kstDateToUtcEnd, kstDateToUtcStart } from '../lib/period';
import { bucketByDay, type TrendPoint } from '../lib/trend';
import { fetchAll } from './fetchAll';

import type { DateRange } from '@/shared/lib/admin/dateRange';

export type AdminTrends = {
  /** 날짜별 방문자(DAU) — user_daily_visits 는 하루 한 사람 한 줄. 관리자 제외 */
  visitors: TrendPoint[];
  signups: TrendPoint[];
  books: TrendPoint[];
};

/**
 * 홈의 기간별 추이 — 날짜만 가져와 서버에서 센다.
 * DB 에 날짜별 집계 함수를 두지 않은 이유: 마이그레이션 없이 되고, 몇 달치 날짜 몇천 줄은
 * 어드민 한 명이 보는 화면에서 충분히 가볍다. 행이 수만을 넘으면 RPC 로 옮길 때다.
 */
export async function getTrends(range: DateRange): Promise<AdminTrends | null> {
  await assertAdmin();
  const supabase = createAdminClient();
  const sinceUtc = kstDateToUtcStart(range.from);
  const untilUtc = kstDateToUtcEnd(range.to);
  const adminIds = await getAdminUserIds();

  const [visits, profiles, books] = await Promise.all([
    fetchAll<{ visit_date: string }>((from, to) => {
      let q = supabase
        .from('user_daily_visits')
        .select('visit_date')
        .gte('visit_date', range.from)
        .lte('visit_date', range.to);
      if (adminIds.length > 0) q = q.not('user_id', 'in', toInFilter(adminIds));
      return q.order('visit_date').order('user_id').range(from, to);
    }, 'visits'),
    fetchAll<{ created_at: string }>(
      (from, to) =>
        supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', sinceUtc)
          .lt('created_at', untilUtc)
          .order('created_at')
          .order('id')
          .range(from, to),
      'profiles'
    ),
    fetchAll<{ created_at: string }>(
      (from, to) =>
        supabase
          .from('books')
          .select('created_at')
          .gte('created_at', sinceUtc)
          .lt('created_at', untilUtc)
          .order('created_at')
          .order('id')
          .range(from, to),
      'books'
    ),
  ]);

  if (!visits || !profiles || !books) return null;

  // timestamptz 는 KST 날짜로 바꿔 센다 — UTC 로 자르면 KST 오전 9시 전 가입이 전날로 샌다
  const toKey = (r: { created_at: string }) =>
    toKstDateKey(new Date(r.created_at));
  return {
    visitors: bucketByDay(
      visits.map((v) => v.visit_date),
      range
    ),
    signups: bucketByDay(profiles.map(toKey), range),
    books: bucketByDay(books.map(toKey), range),
  };
}
