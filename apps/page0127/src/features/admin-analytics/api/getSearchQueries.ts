import { assertAdmin } from '@/shared/lib/admin/assertAdmin';
import { toKstDateKey } from '@/shared/lib/date';
import {
  getGoogleAccessToken,
  missingGoogleConfig,
} from '@/shared/lib/google/serviceAccount';

const SC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const DAY_MS = 24 * 60 * 60 * 1000;

export type SearchQueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  /** 클릭률 0~1 */
  ctr: number;
  /** 평균 검색 순위 (1 = 맨 위) */
  position: number;
};

export type SearchResult =
  | { status: 'ok'; rows: SearchQueryRow[]; startDate: string; endDate: string }
  | { status: 'unconfigured'; missing: string[] }
  | { status: 'error'; message: string };

/**
 * Search Console 검색어별 노출·클릭 (최근 28일).
 *
 * SEARCH_CONSOLE_SITE_URL 은 콘솔에 등록한 속성 이름 그대로 넣는다.
 *   URL 접두어 속성 → 'https://page0127.com/'  (끝 슬래시까지 같아야 한다)
 *   도메인 속성     → 'sc-domain:page0127.com'
 * 서비스 계정은 Search Console 설정 > 사용자 및 권한 에 "제한됨" 이상으로 추가해야 읽힌다.
 */
export async function getSearchQueries(): Promise<SearchResult> {
  await assertAdmin();

  const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL;
  const missing = missingGoogleConfig(
    siteUrl ? [] : ['SEARCH_CONSOLE_SITE_URL']
  );
  if (!siteUrl || missing.length > 0)
    return { status: 'unconfigured', missing };

  // 검색 데이터는 2~3일 늦게 들어온다 — 어제까지 요청해도 마지막 며칠은 비어 있는 게 정상이다
  const now = Date.now();
  const endDate = toKstDateKey(new Date(now - DAY_MS));
  const startDate = toKstDateKey(new Date(now - 28 * DAY_MS));

  try {
    const token = await getGoogleAccessToken([SC_SCOPE]);
    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['query'],
          rowLimit: 20,
        }),
        cache: 'no-store',
      }
    );
    if (!res.ok) {
      throw new Error(
        `Search Console 조회 실패 (${res.status}): ${await res.text()}`
      );
    }
    const json = (await res.json()) as {
      rows?: {
        keys?: string[];
        clicks?: number;
        impressions?: number;
        ctr?: number;
        position?: number;
      }[];
    };
    return {
      status: 'ok',
      startDate,
      endDate,
      rows: (json.rows ?? []).map((r) => ({
        query: r.keys?.[0] ?? '',
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        position: r.position ?? 0,
      })),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[admin] Search Console 조회 실패:', message);
    return { status: 'error', message };
  }
}
