import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import { type DateRange, kstYesterday } from '@/shared/lib/admin/dateRange';
import {
  getAdminUserIds,
  toInFilter,
} from '@/shared/lib/admin/getAdminUserIds';
import { toKstDateKey } from '@/shared/lib/date';

import { kstDateToUtcEnd, kstDateToUtcStart } from '../lib/period';
import {
  computeRetention,
  type RetentionSummary,
  type VisitRow,
} from '../lib/retention';
import { bucketByKstHour } from '../lib/visitHours';
import { fetchAll } from './fetchAll';

import type { TrendPoint } from '../lib/trend';

export type RetentionData = {
  retention: RetentionSummary;
  /** 기간 안 그날 첫 방문 시각(KST 시)별 인원 */
  hours: TrendPoint[];
};

/**
 * D-2 재방문율. 계산은 lib/retention.ts 가 하고, 여기는 필요한 행만 모아 온다.
 *
 * 방문은 기간 시작 ~ **어제**까지 읽는다(기간 끝이 아니라). 기간 마지막 주에 가입한 사람의
 * W1·W4 창은 기간 밖으로 넘어가기 때문이다. 관리자는 방문·가입 양쪽에서 뺀다.
 * 같은 방문 행으로 첫 방문 시각 분포도 센다(조회를 늘리지 않으려고 여기서 함께).
 * 실패하면 null — "재방문 0%"로 보이면 안 된다.
 */
export async function getRetention(
  range: DateRange,
  now = new Date()
): Promise<RetentionData | null> {
  await assertAdmin();
  const supabase = createAdminClient();
  const yesterday = kstYesterday(now);
  const adminIds = await getAdminUserIds();
  const notAdmin = adminIds.length > 0 ? toInFilter(adminIds) : null;

  const [visits, profiles] = await Promise.all([
    fetchAll<VisitRow & { first_visit_at: string }>((from, to) => {
      let q = supabase
        .from('user_daily_visits')
        .select('user_id, visit_date, first_visit_at')
        .gte('visit_date', range.from)
        .lte('visit_date', yesterday);
      if (notAdmin) q = q.not('user_id', 'in', notAdmin);
      return q.order('visit_date').order('user_id').range(from, to);
    }, 'retention-visits'),
    fetchAll<{ id: string; created_at: string }>((from, to) => {
      let q = supabase
        .from('profiles')
        .select('id, created_at')
        .gte('created_at', kstDateToUtcStart(range.from))
        .lt('created_at', kstDateToUtcEnd(range.to));
      if (notAdmin) q = q.not('id', 'in', notAdmin);
      return q.order('created_at').order('id').range(from, to);
    }, 'retention-signups'),
  ]);

  if (!visits || !profiles) return null;

  const retention = computeRetention(
    visits,
    profiles.map((p) => ({
      id: p.id,
      // 가입일도 KST — UTC 로 자르면 오전 9시 전 가입이 전날 코호트로 샌다
      signupDate: toKstDateKey(new Date(p.created_at)),
    })),
    range,
    yesterday
  );
  const hours = bucketByKstHour(
    visits
      .filter((v) => v.visit_date >= range.from && v.visit_date <= range.to)
      .map((v) => v.first_visit_at)
  );
  return { retention, hours };
}
