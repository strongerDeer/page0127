import { createAdminClient } from '@/shared/config/supabase/admin';
import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import {
  type DateRange,
  previousRange,
  toUtcBounds,
} from '@/shared/lib/admin/dateRange';
import {
  getAdminUserIds,
  toInFilter,
} from '@/shared/lib/admin/getAdminUserIds';
import {
  getGoogleAccessToken,
  missingGoogleConfig,
} from '@/shared/lib/google/serviceAccount';

import {
  type CtaLocationRow,
  type EventRow,
  parseCtaLocations,
  parseEvents,
  type PeriodPair,
  toCtaLocationRequest,
  toEventsRequest,
} from '../lib/gaEvents';

import type { GaRow } from '../lib/ga4Reports';

const GA_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

export type GaEventsResult =
  | {
      status: 'ok';
      previous: DateRange;
      events: EventRow[];
      /** null = GA 에 location 맞춤 측정기준이 없어 못 받음 */
      ctaLocations: CtaLocationRow[] | null;
      /** DB 가입(프로필 생성) 수 — GA sign_up 과 나란히 본다. null = 조회 실패 */
      dbSignups: PeriodPair | null;
    }
  | { status: 'unconfigured'; missing: string[] }
  | { status: 'error'; message: string };

const runReport = async (
  propertyId: string,
  token: string,
  body: unknown
): Promise<GaRow[]> => {
  const res = await fetch(
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
  );
  if (!res.ok) {
    throw new Error(`GA4 조회 실패 (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { rows?: GaRow[] };
  return json.rows ?? [];
};

/** 기간 안 프로필 생성 수 (운영자 제외) */
const countSignups = async (
  range: DateRange,
  adminIds: string[]
): Promise<number | null> => {
  const { gte, lt } = toUtcBounds(range);
  let q = createAdminClient()
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', gte)
    .lt('created_at', lt);
  if (adminIds.length > 0) q = q.not('id', 'in', toInFilter(adminIds));
  const { count, error } = await q;
  if (error) {
    console.error('[admin] 가입 수 조회 실패:', error.message);
    return null;
  }
  return count ?? 0;
};

/**
 * 가입 유도 이벤트 깔때기 + CTA 위치 + DB 가입 수. 현재 기간과 바로 앞 같은 길이 기간을 함께 본다.
 * CTA 위치는 맞춤 측정기준이 없으면 실패하므로 따로 보내고, 실패해도 나머지는 보여 준다.
 */
export async function getGaEvents(range: DateRange): Promise<GaEventsResult> {
  await assertAdmin();

  const propertyId = process.env.GA4_PROPERTY_ID;
  const missing = missingGoogleConfig(propertyId ? [] : ['GA4_PROPERTY_ID']);
  if (!propertyId || missing.length > 0)
    return { status: 'unconfigured', missing };

  const previous = previousRange(range);
  try {
    const token = await getGoogleAccessToken([GA_SCOPE]);
    const adminIds = await getAdminUserIds();
    const [eventRows, ctaRows, curSignups, prevSignups] = await Promise.all([
      runReport(propertyId, token, toEventsRequest(range, previous)),
      runReport(propertyId, token, toCtaLocationRequest(range, previous)).catch(
        (e: unknown) => {
          console.error(
            '[admin] CTA 위치 조회 실패(맞춤 측정기준 location 확인):',
            e instanceof Error ? e.message : e
          );
          return null;
        }
      ),
      countSignups(range, adminIds),
      countSignups(previous, adminIds),
    ]);
    return {
      status: 'ok',
      previous,
      events: parseEvents(eventRows),
      ctaLocations: ctaRows ? parseCtaLocations(ctaRows) : null,
      dbSignups:
        curSignups === null || prevSignups === null
          ? null
          : { current: curSignups, previous: prevSignups },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[admin] GA4 이벤트 조회 실패:', message);
    return { status: 'error', message };
  }
}
