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

// KST(UTC+9) 기준으로 월 경계와 일별 버킷을 잡는다.
// 서버가 어떤 타임존에서 돌든(배포는 보통 UTC) 항상 KST 달력 기준이 되도록
// 9시간을 보정한다. (AI 사용량 한도 계산과 동일한 기준)
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 이번 달 1일 00:00(KST)에 해당하는 실제 UTC 시각 ISO
function monthStartISO(now = new Date()): string {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  const startKstAsUtc = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 1);
  return new Date(startKstAsUtc - KST_OFFSET_MS).toISOString();
}

// UTC 타임스탬프를 KST 달력 날짜(YYYY-MM-DD)로 버킷팅한다.
function dayKey(iso: string): string {
  return new Date(new Date(iso).getTime() + KST_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
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

  // 쿼리 실패 시 빈 데이터로 물러나되(대시보드가 죽지 않게) 원인은 로그로 남긴다.
  if (taste.error)
    console.error('[admin] taste_analyses 조회 실패:', taste.error.message);
  if (compat.error)
    console.error(
      '[admin] compatibility_analyses 조회 실패:',
      compat.error.message
    );
  if (usage.error)
    console.error('[admin] ai_usage_logs 조회 실패:', usage.error.message);

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
