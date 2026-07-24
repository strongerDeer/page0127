import { createClient } from '@supabase/supabase-js';

import type {
  FieldHistory,
  FieldHistoryPoint,
  QualityRecord,
} from './types.ts';

// service_role 클라이언트 — RLS 우회. CI/서버에서만. 키를 로그에 남기지 않는다.
const db = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.'
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
};

// 회귀 판정용 직전 레코드들(최근 → 과거). record jsonb만 꺼내 복원한다.
export const readPriorRecords = async (): Promise<QualityRecord[]> => {
  const { data, error } = await db()
    .from('quality_records')
    .select('record')
    .order('measured_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  // analyze()는 오름차순(과거→현재)을 기대하므로 뒤집는다.
  return (data ?? []).map((r) => r.record as QualityRecord).reverse();
};

export const saveRecord = async (
  record: QualityRecord,
  reportMd: string
): Promise<void> => {
  const { error } = await db().from('quality_records').insert({
    measured_at: record.timestamp,
    git_ref: record.gitRef,
    form_factors: record.desktopPages ? ['mobile', 'desktop'] : ['mobile'],
    record,
    report_md: reportMd,
    schema_version: 1,
  });
  if (error) throw error;
};

// CrUX 추세: period_end 기준 upsert. 'all' 시리즈(가장 긴 추세)만 저장한다.
// (period_end, metric) 복합 PK라 재측정 시 같은 주는 최신값으로 덮어쓴다(병합).
export const saveFieldHistoryToDb = async (
  history: FieldHistory
): Promise<void> => {
  const series = history.all ?? history.mobile ?? history.desktop;
  if (!series) return;

  // 지표 5종만 순회한다. periodStart/periodEnd는 문자열 필드라 아래 타입가드로 걸러진다.
  const metrics: (keyof FieldHistoryPoint)[] = [
    'lcp',
    'inp',
    'cls',
    'fcp',
    'ttfb',
  ];
  const rows = series.points.flatMap((pt) =>
    metrics
      .map((m) => {
        const mp = pt[m];
        // 문자열(periodStart/End)·undefined는 제외하고 지표 포인트 객체만 행으로.
        if (!mp || typeof mp !== 'object') return null;
        return {
          period_end: pt.periodEnd,
          metric: m as string,
          period_start: pt.periodStart,
          p75: mp.p75 ?? null,
          good: mp.good ?? null,
          needs_improvement: mp.needsImprovement ?? null,
          poor: mp.poor ?? null,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
  );
  if (rows.length === 0) return;

  const { error } = await db()
    .from('quality_field_history')
    .upsert(rows, { onConflict: 'period_end,metric' });
  if (error) throw error;
};
