import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import {
  buildCostsUrl,
  type CostBucket,
  type OpenAiCosts,
  parseCostBuckets,
} from '../lib/openAiCosts';

export type OpenAiCostsFailure =
  | { kind: 'no-key' }
  | { kind: 'forbidden' }
  | { kind: 'error'; status?: number };

export type OpenAiCostsResult =
  { ok: true; costs: OpenAiCosts } | { ok: false; failure: OpenAiCostsFailure };

type CostsPage = {
  data?: CostBucket[];
  has_more?: boolean;
  next_page?: string | null;
};

/** 한 달(31버킷)은 한 쪽에 다 온다 — 쪽 넘김이 끝없이 이어지는 것만 막는다 */
const MAX_PAGES = 5;

/**
 * 이번 달 OpenAI 실제 청구액(로컬·운영·테스트 전부 합친 조직 전체) — 어드민 화면용.
 *
 * 관리자 키(OPENAI_ADMIN_KEY, sk-admin-…)가 있어야 한다 — 일반 프로젝트 키로는 401/403.
 * getSentryIssues 와 같이 실패해도 예외를 던지지 않는다: 비용 화면의 다른 칸(앱 기록)은 살아 있어야 한다.
 */
export async function getOpenAiCosts(
  now = new Date()
): Promise<OpenAiCostsResult> {
  await assertAdmin();
  // 어드민을 새로고침할 때마다 부르지 않게 — Sentry 조회와 같은 5분
  return fetchOpenAiCosts(now, { next: { revalidate: 300 } });
}

/**
 * 관리자 확인 없이 청구액을 읽는다. **크론처럼 이미 다른 방법으로 인증된 서버 경로 전용.**
 * `now` 가 속한 달(KST)의 1일부터 읽는다.
 */
export async function fetchOpenAiCosts(
  now: Date,
  cacheInit: Pick<RequestInit, 'cache' | 'next'> = { cache: 'no-store' }
): Promise<OpenAiCostsResult> {
  const key = process.env.OPENAI_ADMIN_KEY;
  if (!key) return { ok: false, failure: { kind: 'no-key' } };

  try {
    const buckets: CostBucket[] = [];
    let page: string | undefined;

    for (let i = 0; i < MAX_PAGES; i++) {
      const res = await fetch(buildCostsUrl(now, page), {
        headers: { Authorization: `Bearer ${key}` },
        ...cacheInit,
      });
      if (res.status === 401 || res.status === 403) {
        return { ok: false, failure: { kind: 'forbidden' } };
      }
      if (!res.ok) {
        return { ok: false, failure: { kind: 'error', status: res.status } };
      }

      const body = (await res.json()) as CostsPage;
      buckets.push(...(body.data ?? []));
      if (!body.has_more || !body.next_page) break;
      page = body.next_page;
    }

    return { ok: true, costs: parseCostBuckets(buckets) };
  } catch {
    console.error('OpenAI 비용 조회 실패');
    return { ok: false, failure: { kind: 'error' } };
  }
}
