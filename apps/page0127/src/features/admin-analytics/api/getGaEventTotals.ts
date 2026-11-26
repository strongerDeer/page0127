import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import {
  getCachedGoogleAccessToken,
  missingGoogleConfig,
} from '@/shared/lib/google/serviceAccount';

import {
  type EventTotals,
  parseEventTotals,
  toEventTotalsRequest,
} from '../lib/eventTimeline';
import { fetchWithGaRetry } from '../lib/gaRetry';

import type { GaRow } from '../lib/ga4Reports';
import type { DateRange } from '@/shared/lib/admin/dateRange';
import type { AnalyticsEvent } from '@/shared/lib/analytics/trackEvent';

const GA_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

/**
 * 기간 안 이벤트별 횟수·사용자 — GA 요청 하나.
 * 실패하거나 GA 설정이 없으면 null: 화면은 DB 숫자만 보여 주고 GA 칸은 "못 불러옴"으로 둔다.
 */
export async function getGaEventTotals(
  range: DateRange,
  names: AnalyticsEvent[]
): Promise<EventTotals | null> {
  await assertAdmin();
  const propertyId = process.env.GA4_PROPERTY_ID;
  const missing = missingGoogleConfig(propertyId ? [] : ['GA4_PROPERTY_ID']);
  if (!propertyId || missing.length > 0) return null;

  try {
    const token = await getCachedGoogleAccessToken([GA_SCOPE]);
    const res = await fetchWithGaRetry(() =>
      fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(toEventTotalsRequest(range, names)),
          cache: 'no-store',
        }
      )
    );
    if (!res.ok)
      throw new Error(`GA4 조회 실패 (${res.status}): ${await res.text()}`);
    const rows = ((await res.json()) as { rows?: GaRow[] }).rows ?? [];
    return parseEventTotals(rows, names);
  } catch (e) {
    console.error(
      '[admin] GA4 기능별 이벤트 조회 실패:',
      e instanceof Error ? e.message : e
    );
    return null;
  }
}
