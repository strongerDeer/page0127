import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import type { QualityRecord } from '@repo/quality/types';

/**
 * 가장 최근 품질 측정의 회귀(나빠진 항목) 건수 — 어드민 홈 "오늘 볼 것"용.
 * 측정 기록이 없거나 조회에 실패하면 null. 0 과 구분해야 "문제 없음"으로 오해하지 않는다.
 */
export async function getLatestRegressionCount(): Promise<number | null> {
  await assertAdmin();
  const { data, error } = await createAdminClient()
    .from('quality_records')
    .select('record')
    .order('measured_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('[admin] 최근 품질 기록 조회 실패:', error.message);
    return null;
  }
  const record = data?.record as QualityRecord | undefined;
  return record ? (record.regressions ?? []).length : null;
}
