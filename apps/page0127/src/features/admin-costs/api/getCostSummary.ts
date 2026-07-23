import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import { sumCents } from '../lib/cost';

export type CostSummary = {
  monthTotalCents: number;
  daily: { date: string; cents: number }[];
  byFeature: {
    taste: { cents: number; count: number };
    compatibility: { cents: number; count: number };
  };
  topUsers: { userId: string; count: number }[];
};

// 이번 달 1일 00:00(로컬 근사, UTC)로 시작 경계를 잡는다.
function monthStartISO(now = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();
}

function dayKey(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD
}

export async function getCostSummary(): Promise<CostSummary> {
  await assertAdmin();
  const supabase = createAdminClient();
  const since = monthStartISO();

  const [taste, compat, usage] = await Promise.all([
    supabase
      .from('taste_analyses')
      .select('cost_in_cents, created_at')
      .gte('created_at', since),
    supabase
      .from('compatibility_analyses')
      .select('cost_in_cents, created_at')
      .gte('created_at', since),
    supabase
      .from('ai_usage_logs')
      .select('user_id, feature, created_at')
      .gte('created_at', since),
  ]);

  const tasteRows = taste.data ?? [];
  const compatRows = compat.data ?? [];
  const usageRows = usage.data ?? [];

  const monthTotalCents = sumCents(tasteRows) + sumCents(compatRows);

  // 일별 비용 합산
  const dailyMap = new Map<string, number>();
  for (const r of [...tasteRows, ...compatRows]) {
    const k = dayKey(r.created_at);
    dailyMap.set(k, (dailyMap.get(k) ?? 0) + (r.cost_in_cents ?? 0));
  }
  const daily = [...dailyMap.entries()]
    .map(([date, cents]) => ({ date, cents }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 기능별 건수 (ai_usage_logs), 비용은 각 분석 테이블 합
  const count = (f: string) => usageRows.filter((u) => u.feature === f).length;
  const byFeature = {
    taste: { cents: sumCents(tasteRows), count: count('taste_analysis') },
    compatibility: {
      cents: sumCents(compatRows),
      count: count('compatibility'),
    },
  };

  // 사용자별 호출 건수 Top 10 (비용 아님 — 궁합은 단일 귀속 불가)
  const userMap = new Map<string, number>();
  for (const u of usageRows) {
    userMap.set(u.user_id, (userMap.get(u.user_id) ?? 0) + 1);
  }
  const topUsers = [...userMap.entries()]
    .map(([userId, c]) => ({ userId, count: c }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { monthTotalCents, daily, byFeature, topUsers };
}
