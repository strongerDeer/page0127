import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import type { QualityRecord } from '@repo/quality/types';

export type FieldHistoryRow = {
  period_end: string;
  metric: string;
  p75: number | null;
  good: number | null;
};

export type QualityDashboard = {
  latest: QualityRecord | null;
  fieldHistory: FieldHistoryRow[];
};

export async function getQualityDashboard(): Promise<QualityDashboard> {
  await assertAdmin();
  const supabase = createAdminClient();

  const [latestRes, historyRes] = await Promise.all([
    supabase
      .from('quality_records')
      .select('record')
      .order('measured_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('quality_field_history')
      .select('period_end, metric, p75, good')
      .order('period_end', { ascending: true }),
  ]);

  if (latestRes.error)
    console.error('[admin] quality_records 조회 실패:', latestRes.error.message);
  if (historyRes.error)
    console.error('[admin] field_history 조회 실패:', historyRes.error.message);

  return {
    latest: (latestRes.data?.record as QualityRecord) ?? null,
    fieldHistory: (historyRes.data as FieldHistoryRow[]) ?? [],
  };
}
