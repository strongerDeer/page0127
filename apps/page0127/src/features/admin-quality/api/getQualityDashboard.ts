import { summarizeRum, summarizeRumByDay } from '@repo/quality/rum';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import type {
  RumDailyPoint,
  RumMetricName,
  RumMetricSummary,
} from '@repo/quality/rum';
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

// 자체 RUM 집계 창. CrUX의 28일 이동창과 맞춰야 두 열을 나란히 읽을 수 있다.
const RUM_WINDOW_DAYS = 28;

// PostgREST는 지정하지 않으면 1000행에서 조용히 끊는다. 그대로 두면 p75가 "최근 1000건"의
// 값인데 화면엔 "최근 28일"이라고 적히는 거짓말이 된다. 상한을 명시하고, 걸렸는지도 알린다.
const RUM_ROW_CAP = 10_000;

// 일별 추세로 보여줄 지표. LCP가 로딩 체감을 가장 잘 대표하고 표본도 가장 많다
// (CLS·INP는 브라우저 지원이 갈려 선이 자주 끊긴다).
const RUM_TREND_METRIC: RumMetricName = 'lcp';

export type RumWindow = {
  windowDays: number;
  /** 상한에 걸려 창 전체를 못 읽었는가. true면 "최근 N건 기준"으로 읽어야 한다. */
  truncated: boolean;
  /** 표본이 있는 지표만 담긴다. 없는 지표는 아예 빠진다(0으로 채우지 않는다). */
  summaries: RumMetricSummary[];
  /** LCP 일별 p75. 표본이 있는 날만 들어간다 — 빈 날은 선을 잇지 않는다. */
  trendMetric: RumMetricName;
  trend: RumDailyPoint[];
};

export type QualityDashboard = {
  latest: QualityRecord | null;
  // 오래된→최신 순. 그리드·추세 차트가 시계열로 쓴다. 레코드가 1건뿐이면 latest와 같은 1건.
  records: QualityRecord[];
  fieldHistory: FieldHistoryRow[];
  /**
   * 자체 RUM 집계. **null은 "조회 실패"이지 "샘플 0건"이 아니다.** 둘을 같은 값으로
   * 뭉개면 DB가 죽은 상태가 "아직 방문자가 없음"으로 보인다.
   */
  rum: RumWindow | null;
};

export async function getQualityDashboard(): Promise<QualityDashboard> {
  await assertAdmin();
  const supabase = createAdminClient();

  const since = new Date(
    Date.now() - RUM_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const [recordsRes, historyRes, rumRes] = await Promise.all([
    supabase
      .from('quality_records')
      .select('record')
      .order('measured_at', { ascending: false })
      .limit(HISTORY_LIMIT),
    supabase
      .from('quality_field_history')
      .select('period_end, metric, p75, good')
      .order('period_end', { ascending: true }),
    // production만 집계한다 — 프리뷰·로컬 측정이 운영 지표를 오염시키면 안 된다.
    supabase
      .from('quality_rum_samples')
      .select('metric, value, received_at')
      .eq('env', 'production')
      .gte('received_at', since)
      .order('received_at', { ascending: false })
      .limit(RUM_ROW_CAP),
  ]);

  if (recordsRes.error)
    console.error('[admin] quality_records 조회 실패:', recordsRes.error.message);
  if (historyRes.error)
    console.error('[admin] field_history 조회 실패:', historyRes.error.message);
  if (rumRes.error)
    console.error('[admin] rum_samples 조회 실패:', rumRes.error.message);

  // DB는 최신순(desc)으로 주지만 차트는 시간순(오래된→최신)이 필요하다 → 뒤집는다.
  const desc = (recordsRes.data ?? []).map((r) => r.record as QualityRecord);

  // 실패(error)와 빈 결과(data: [])를 구분한다. `?? []`로 뭉개면 DB 장애가
  // "아직 방문자가 없음"으로 보인다.
  const rumRows = rumRes.error
    ? null
    : (rumRes.data as {
        metric: RumMetricName;
        value: number;
        received_at: string;
      }[]);

  return {
    latest: desc[0] ?? null, // desc의 첫 항목이 가장 최신
    records: [...desc].reverse(),
    fieldHistory: (historyRes.data as FieldHistoryRow[]) ?? [],
    rum: rumRows
      ? {
          windowDays: RUM_WINDOW_DAYS,
          truncated: rumRows.length >= RUM_ROW_CAP,
          summaries: summarizeRum(rumRows),
          trendMetric: RUM_TREND_METRIC,
          trend: summarizeRumByDay(
            rumRows.map((row) => ({ ...row, receivedAt: row.received_at })),
            RUM_TREND_METRIC
          ),
        }
      : null,
  };
}
