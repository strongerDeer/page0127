import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import { type DateRange, kstToday } from '@/shared/lib/admin/dateRange';
import {
  getCachedGoogleAccessToken,
  missingGoogleConfig,
} from '@/shared/lib/google/serviceAccount';

import {
  heatDays,
  parseDailyEvents,
  parseHourlyEvents,
  type TimelineGroup,
  toDailyEventsRequest,
  toHourlyEventsRequest,
} from '../lib/eventTimeline';
import { fetchWithGaRetry } from '../lib/gaRetry';

import type { GaRow } from '../lib/ga4Reports';

const GA_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

export type GaEventTimelineResult =
  | {
      status: 'ok';
      /** 날짜 칸 — 기간이 31일보다 길면 마지막 31일 */
      days: string[];
      daily: TimelineGroup[];
      /** 오늘(KST) — 시간 칸의 뒤 24칸 */
      today: string;
      hourly: TimelineGroup[];
    }
  | { status: 'unconfigured'; missing: string[] }
  | { status: 'error'; message: string };

const runReport = async (
  propertyId: string,
  token: string,
  body: unknown
): Promise<GaRow[]> => {
  const res = await fetchWithGaRetry(() =>
    fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        cache: 'no-store',
      }
    )
  );
  if (!res.ok) {
    throw new Error(`GA4 조회 실패 (${res.status}): ${await res.text()}`);
  }
  return ((await res.json()) as { rows?: GaRow[] }).rows ?? [];
};

/**
 * 이벤트 현황 — 이벤트 × 날짜, 이벤트 × 시간(오늘·어제).
 * 두 요청만 보낸다(동시 요청 한도). 페이지는 이벤트 깔때기가 끝난 뒤에 이걸 부른다.
 */
export async function getGaEventTimeline(
  range: DateRange,
  now: Date = new Date()
): Promise<GaEventTimelineResult> {
  await assertAdmin();

  const propertyId = process.env.GA4_PROPERTY_ID;
  const missing = missingGoogleConfig(propertyId ? [] : ['GA4_PROPERTY_ID']);
  if (!propertyId || missing.length > 0)
    return { status: 'unconfigured', missing };

  const days = heatDays(range);
  const today = kstToday(now);
  try {
    const token = await getCachedGoogleAccessToken([GA_SCOPE]);
    const [dailyRows, hourlyRows] = await Promise.all([
      runReport(propertyId, token, toDailyEventsRequest(days)),
      runReport(propertyId, token, toHourlyEventsRequest(today)),
    ]);
    return {
      status: 'ok',
      days,
      daily: parseDailyEvents(dailyRows, days),
      today,
      hourly: parseHourlyEvents(hourlyRows, today),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[admin] GA4 이벤트 현황 조회 실패:', message);
    return { status: 'error', message };
  }
}
