import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import {
  getCachedGoogleAccessToken,
  missingGoogleConfig,
} from '@/shared/lib/google/serviceAccount';

import { fetchWithGaRetry } from '../lib/gaRetry';

import type { GaRow } from '../lib/ga4Reports';

const GA_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

export type GaRealtimeResult =
  | {
      status: 'ok';
      /** 지난 30분 활성 사용자 */
      activeUsers: number;
      /** 지금 보고 있는 화면(페이지 제목) 상위 5개 */
      pages: { title: string; users: number }[];
    }
  | { status: 'unconfigured'; missing: string[] }
  | { status: 'error'; message: string };

/**
 * GA4 실시간 — 지난 30분 동안 들어와 있는 사람. 인스타에 올린 직후 반응을 보려는 칸.
 *
 * 실시간 API(runRealtimeReport)는 일반 보고서와 쿼터가 따로라 보고서 batch 를 기다리지 않고 나란히 보낸다.
 * 운영자 기기는 MarkAdminDevice 로 GA 전송을 끄므로 내가 보고 있는 건 안 잡힌다.
 * 실시간에는 국가 필터를 걸지 않는다 — 30분 단위라 봇 몇 개가 섞여도 "반응이 있나"를 보는 데는 충분하다.
 */
export async function getGaRealtime(): Promise<GaRealtimeResult> {
  await assertAdmin();

  const propertyId = process.env.GA4_PROPERTY_ID;
  const missing = missingGoogleConfig(propertyId ? [] : ['GA4_PROPERTY_ID']);
  if (missing.length > 0) return { status: 'unconfigured', missing };

  try {
    const token = await getCachedGoogleAccessToken([GA_SCOPE]);
    const run = async (body: object) => {
      const res = await fetchWithGaRetry(() =>
        fetch(
          `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
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
      if (!res.ok)
        throw new Error(
          `GA4 실시간 조회 실패 (${res.status}): ${await res.text()}`
        );
      return ((await res.json()) as { rows?: GaRow[] }).rows ?? [];
    };

    const [total, byPage] = await Promise.all([
      run({ metrics: [{ name: 'activeUsers' }] }),
      run({
        dimensions: [{ name: 'unifiedScreenName' }],
        metrics: [{ name: 'activeUsers' }],
        limit: 5,
      }),
    ]);

    return {
      status: 'ok',
      activeUsers: Number(total[0]?.metricValues?.[0]?.value ?? 0),
      pages: byPage.map((r) => ({
        title: r.dimensionValues?.[0]?.value || '(알 수 없음)',
        users: Number(r.metricValues?.[0]?.value ?? 0),
      })),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[admin] GA4 실시간 조회 실패:', message);
    return { status: 'error', message };
  }
}
