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

/**
 * 다시 불러 볼 만한 실패인가 — 429(잠깐 너무 많이 부름)·5xx(OpenAI 쪽 장애)·네트워크 오류(status 없음).
 *
 * 401·403(forbidden)·no-key 는 다시 불러도 결과가 같으니 재시도하지 않는다.
 * 400·404 같은 4xx 도 요청 자체가 잘못된 것이라 똑같이 실패한다.
 */
export const isRetryableCostsFailure = (
  failure: OpenAiCostsFailure
): boolean => {
  if (failure.kind !== 'error') return false;
  if (failure.status === undefined) return true;
  return failure.status === 429 || failure.status >= 500;
};

/** 로그·응답에 남길 실패 이유 — 다음에 알림이 오면 키 문제인지 OpenAI 장애인지 바로 보이게 */
export const describeCostsFailure = (failure: OpenAiCostsFailure): string => {
  if (failure.kind === 'error') {
    return failure.status === undefined
      ? 'error(network)'
      : `error(status ${failure.status})`;
  }
  return failure.kind;
};

const RETRY_DELAY_MS = 3000;

/**
 * 크론 전용: 일시적인 실패면 한 번만 더 부른다.
 *
 * 왜 크론에만 두나: check-ai-billing 은 "어제 하루"만 보므로 그날 실패하면 그날의
 * 예산 기준선 알림은 다시 오지 않는다(2026-11-15 502). 어드민 화면은 새로고침하면 되니
 * 사용자를 3초 더 기다리게 할 이유가 없다.
 * GET 조회라 두 번 불러도 부작용이 없다(멱등) — 그래서 재시도해도 안전하다.
 */
export async function fetchOpenAiCostsWithRetry(
  now: Date,
  { retryDelayMs = RETRY_DELAY_MS }: { retryDelayMs?: number } = {}
): Promise<OpenAiCostsResult> {
  const first = await fetchOpenAiCosts(now);
  if (first.ok || !isRetryableCostsFailure(first.failure)) return first;

  console.warn(
    `OpenAI 청구액 조회 재시도: ${describeCostsFailure(first.failure)}`
  );
  await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  return fetchOpenAiCosts(now);
}
