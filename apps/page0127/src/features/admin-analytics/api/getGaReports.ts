import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import {
  comparableRange,
  type DateRange,
  previousRange,
} from '@/shared/lib/admin/dateRange';
import {
  getCachedGoogleAccessToken,
  missingGoogleConfig,
} from '@/shared/lib/google/serviceAccount';

import {
  type GaRow,
  parseReport,
  type ReportDef,
  type ReportKey,
  REPORTS,
  type ReportTable,
  toRunReportRequest,
} from '../lib/ga4Reports';
import { fetchWithGaRetry, mapWithConcurrency } from '../lib/gaRetry';

const GA_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

// batchRunReports 는 한 번에 최대 5개 보고서까지 받는다
const BATCH_SIZE = 5;
// batch 를 한꺼번에 다 보내지 않고 2개씩만 동시에 보낸다 — GA "동시 요청" 한도(429) 대비
const BATCH_CONCURRENCY = 2;

export type GaResult =
  | {
      status: 'ok';
      reports: Record<ReportKey, ReportTable>;
      /** 바로 앞 같은 길이 기간의 요약 — 타일의 증감 표시용 */
      previousSummary: ReportTable;
      /**
       * 증감 비교용 "이번" 요약 — 오늘(집계 중)을 뺀 끝난 날들. 오늘이 없으면 summary 와 같다.
       * 오늘 하루만 고르면 견줄 날이 없어 null
       */
      comparableSummary: ReportTable | null;
      previous: DateRange;
    }
  /** 설정이 비었다 — 화면이 빠진 변수 이름을 보여 준다 */
  | { status: 'unconfigured'; missing: string[] }
  | { status: 'error'; message: string };

/**
 * GA4 Data API 로 유입분석 보고서를 한꺼번에 받는다.
 *
 * 15개(+ 앞 기간 요약 1개)를 따로 부르면 GA 의 "속성당 동시 요청 10개" 한도에 걸릴 수 있어
 * 5개씩 묶은 batch 요청으로 보낸다.
 */
export async function getGaReports(range: DateRange): Promise<GaResult> {
  await assertAdmin();

  const propertyId = process.env.GA4_PROPERTY_ID;
  const missing = missingGoogleConfig(propertyId ? [] : ['GA4_PROPERTY_ID']);
  if (missing.length > 0) return { status: 'unconfigured', missing };

  // 증감은 끝난 날끼리 — 오늘이 들면 어제까지로 자른 기간과 그 앞 같은 길이를 견준다
  const comparable = comparableRange(range);
  const previous = previousRange(comparable ?? range);
  const summaryDef = REPORTS.find((d) => d.key === 'summary');
  // 'previousSummary' = 앞 기간 요약, 'comparableSummary' = 오늘 뺀 이번 요약 — 나머지는 고른 기간
  type Job = {
    key: ReportKey | 'previousSummary' | 'comparableSummary';
    def: ReportDef;
    range: DateRange;
  };
  const jobs: Job[] = REPORTS.map((def) => ({ key: def.key, def, range }));
  if (summaryDef && comparable) {
    jobs.push({ key: 'previousSummary', def: summaryDef, range: previous });
    if (comparable !== range)
      jobs.push({
        key: 'comparableSummary',
        def: summaryDef,
        range: comparable,
      });
  }

  const batches: Job[][] = [];
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    batches.push(jobs.slice(i, i + BATCH_SIZE));
  }

  try {
    const token = await getCachedGoogleAccessToken([GA_SCOPE]);
    const responses = await mapWithConcurrency(
      batches,
      BATCH_CONCURRENCY,
      async (batch) => {
        const res = await fetchWithGaRetry(() =>
          fetch(
            `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:batchRunReports`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                requests: batch.map((j) => toRunReportRequest(j.def, j.range)),
              }),
              cache: 'no-store',
            }
          )
        );
        if (!res.ok) {
          // 403 이면 대개 서비스 계정을 GA 속성 "뷰어"로 추가하지 않은 것이다
          throw new Error(`GA4 조회 실패 (${res.status}): ${await res.text()}`);
        }
        const json = (await res.json()) as { reports?: { rows?: GaRow[] }[] };
        return batch.map(
          (j, i) =>
            [j.key, parseReport(j.def, json.reports?.[i]?.rows)] as const
        );
      }
    );
    const { previousSummary, comparableSummary, ...reports } =
      Object.fromEntries(responses.flat()) as Record<
        ReportKey | 'previousSummary' | 'comparableSummary',
        ReportTable
      >;
    return {
      status: 'ok',
      reports,
      previousSummary: previousSummary ?? { rows: [] },
      comparableSummary: comparable
        ? (comparableSummary ?? reports.summary)
        : null,
      previous,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[admin] GA4 보고서 조회 실패:', message);
    return { status: 'error', message };
  }
}
