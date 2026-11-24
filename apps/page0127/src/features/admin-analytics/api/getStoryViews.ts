import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import {
  getCachedGoogleAccessToken,
  missingGoogleConfig,
} from '@/shared/lib/google/serviceAccount';

import { fetchWithGaRetry } from '../lib/gaRetry';
import {
  parseStoryViews,
  type StoryViews,
  toStoryViewsRequest,
} from '../lib/storyViews';

import type { GaRow } from '../lib/ga4Reports';
import type { DateRange } from '@/shared/lib/admin/dateRange';

const GA_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

export type StoryViewsResult =
  | { status: 'ok'; bySlug: Map<string, StoryViews> }
  | { status: 'unconfigured' }
  | { status: 'error' };

/** 어드민 책 이야기 목록 — 기간 안 글별 페이지뷰·사용자(GA4, 사람 추정) */
export async function getStoryViews(
  range: DateRange
): Promise<StoryViewsResult> {
  await assertAdmin();

  const propertyId = process.env.GA4_PROPERTY_ID;
  const missing = missingGoogleConfig(propertyId ? [] : ['GA4_PROPERTY_ID']);
  if (!propertyId || missing.length > 0) return { status: 'unconfigured' };

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
          body: JSON.stringify(toStoryViewsRequest(range)),
          cache: 'no-store',
        }
      )
    );
    if (!res.ok)
      throw new Error(`GA4 조회 실패 (${res.status}): ${await res.text()}`);
    const json = (await res.json()) as { rows?: GaRow[] };
    return { status: 'ok', bySlug: parseStoryViews(json.rows ?? []) };
  } catch (error) {
    // 조회수는 곁가지 — 실패해도 글 목록은 그대로 보여 준다
    console.error(
      '[admin] 책 이야기 조회수 실패:',
      error instanceof Error ? error.message : error
    );
    return { status: 'error' };
  }
}
