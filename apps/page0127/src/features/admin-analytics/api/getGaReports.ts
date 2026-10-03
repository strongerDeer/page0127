import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import {
  getGoogleAccessToken,
  missingGoogleConfig,
} from '@/shared/lib/google/serviceAccount';

import {
  type GaRow,
  parseReport,
  type ReportKey,
  REPORTS,
  type ReportTable,
  toRunReportRequest,
} from '../lib/ga4Reports';

const GA_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

// batchRunReports 는 한 번에 최대 5개 보고서까지 받는다
const BATCH_SIZE = 5;

export type GaResult =
  | { status: 'ok'; reports: Record<ReportKey, ReportTable> }
  /** 설정이 비었다 — 화면이 빠진 변수 이름을 보여 준다 */
  | { status: 'unconfigured'; missing: string[] }
  | { status: 'error'; message: string };

/**
 * GA4 Data API 로 유입분석 보고서를 한꺼번에 받는다.
 *
 * 14개를 따로 부르면 GA 의 "속성당 동시 요청 10개" 한도에 걸릴 수 있어
 * 5개씩 묶은 batch 요청 3번으로 보낸다.
 */
export async function getGaReports(): Promise<GaResult> {
  await assertAdmin();

  const propertyId = process.env.GA4_PROPERTY_ID;
  const missing = missingGoogleConfig(propertyId ? [] : ['GA4_PROPERTY_ID']);
  if (missing.length > 0) return { status: 'unconfigured', missing };

  const batches: (typeof REPORTS)[] = [];
  for (let i = 0; i < REPORTS.length; i += BATCH_SIZE) {
    batches.push(REPORTS.slice(i, i + BATCH_SIZE));
  }

  try {
    const token = await getGoogleAccessToken([GA_SCOPE]);
    const responses = await Promise.all(
      batches.map(async (defs) => {
        const res = await fetch(
          `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:batchRunReports`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requests: defs.map(toRunReportRequest) }),
            cache: 'no-store',
          }
        );
        if (!res.ok) {
          // 403 이면 대개 서비스 계정을 GA 속성 "뷰어"로 추가하지 않은 것이다
          throw new Error(`GA4 조회 실패 (${res.status}): ${await res.text()}`);
        }
        const json = (await res.json()) as { reports?: { rows?: GaRow[] }[] };
        return defs.map(
          (def, i) =>
            [def.key, parseReport(def, json.reports?.[i]?.rows)] as const
        );
      })
    );
    return {
      status: 'ok',
      reports: Object.fromEntries(responses.flat()) as Record<
        ReportKey,
        ReportTable
      >,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[admin] GA4 보고서 조회 실패:', message);
    return { status: 'error', message };
  }
}
