import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import type { QualityRecord } from '@repo/quality/types';

export type FieldHistoryRow = {
  period_end: string;
  metric: string;
  p75: number | null;
  good: number | null;
};

// 추세 차트가 쓸 최근 측정 레코드 수. 주 1회 측정 기준 약 반년치다.
// (CrUX 추세가 최대 25주 백필이라 얼추 맞춘다. 더 늘려도 되지만 초기엔 이 정도로 충분.)
const HISTORY_LIMIT = 26;

export type QualityDashboard = {
  latest: QualityRecord | null;
  // 오래된→최신 순. 그리드·추세 차트가 시계열로 쓴다. 레코드가 1건뿐이면 latest와 같은 1건.
  records: QualityRecord[];
  fieldHistory: FieldHistoryRow[];
};

export async function getQualityDashboard(): Promise<QualityDashboard> {
  await assertAdmin();
  const supabase = createAdminClient();

  const [recordsRes, historyRes] = await Promise.all([
    supabase
      .from('quality_records')
      .select('record')
      .order('measured_at', { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase
      .from('quality_field_history')
      .select('period_end, metric, p75, good')
      .order('period_end', { ascending: true }),
  ]);

  if (recordsRes.error)
    console.error('[admin] quality_records 조회 실패:', recordsRes.error.message);
  if (historyRes.error)
    console.error('[admin] field_history 조회 실패:', historyRes.error.message);

  // DB는 최신순(desc)으로 주지만 차트는 시간순(오래된→최신)이 필요하다 → 뒤집는다.
  const desc = (recordsRes.data ?? []).map((r) => r.record as QualityRecord);

  return {
    latest: desc[0] ?? null, // desc의 첫 항목이 가장 최신
    records: [...desc].reverse(),
    fieldHistory: (historyRes.data as FieldHistoryRow[]) ?? [],
  };
}
