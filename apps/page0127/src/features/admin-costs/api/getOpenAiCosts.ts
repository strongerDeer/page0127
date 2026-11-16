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
  | {
      kind: 'error';
      status?: number;
      /** OpenAI 오류 본문의 error.code — 429 가 한도(rate_limit_exceeded)인지 잔액(insufficient_quota)인지 가른다 */
      code?: string;
      /** Retry-After 헤더(밀리초) — OpenAI 가 "이만큼 기다렸다 다시 와" 라고 알려 준 값 */
      retryAfterMs?: number;
    };

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
/** Retry-After 는 초(숫자) 또는 HTTP 날짜로 온다 */
const parseRetryAfterMs = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
};

/** 실패 응답에서 status·error.code·Retry-After 를 뽑는다. 본문이 JSON 이 아니어도 status 는 남긴다 */
const toErrorFailure = async (res: Response): Promise<OpenAiCostsFailure> => {
  let code: string | undefined;
  try {
    const body = (await res.json()) as { error?: { code?: unknown } };
    if (typeof body.error?.code === 'string') code = body.error.code;
  } catch {
    // 본문이 비었거나 JSON 이 아님 — status 만으로 판단
  }
  const retryAfterMs = parseRetryAfterMs(res.headers.get('retry-after'));
  return {
    kind: 'error',
    status: res.status,
    ...(code && { code }),
    ...(retryAfterMs !== undefined && { retryAfterMs }),
  };
};

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
        return { ok: false, failure: await toErrorFailure(res) };
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
 * 429 라도 insufficient_quota(크레딧·결제 한도 소진)는 기다려도 풀리지 않는다.
 */
export const isRetryableCostsFailure = (
  failure: OpenAiCostsFailure
): boolean => {
  if (failure.kind !== 'error') return false;
  if (failure.code === 'insufficient_quota') return false;
  if (failure.status === undefined) return true;
  return failure.status === 429 || failure.status >= 500;
};

/** 로그·응답에 남길 실패 이유 — 다음에 알림이 오면 키 문제인지 OpenAI 장애인지 바로 보이게 */
export const describeCostsFailure = (failure: OpenAiCostsFailure): string => {
  if (failure.kind !== 'error') return failure.kind;
  if (failure.status === undefined) return 'error(network)';
  return failure.code
    ? `error(status ${failure.status}, ${failure.code})`
    : `error(status ${failure.status})`;
};

/**
 * 재시도 사이 대기(지수 백오프): 5초 → 15초 → 30초.
 * 다 합쳐도 1분이 안 되게 잡았다 — Hobby 로 내려가도 함수 시간 한도 안에 끝나게.
 */
const RETRY_DELAYS_MS = [5_000, 15_000, 30_000];
/** Retry-After 가 아주 길게 와도 이 이상은 기다리지 않는다(그땐 내일 크론에 맡김) */
const MAX_RETRY_AFTER_MS = 30_000;

/** 다음 대기 시간 — OpenAI 가 Retry-After 를 주면 그 값을 존중하고, 없으면 백오프 표를 따른다 */
export const nextRetryDelayMs = (
  failure: OpenAiCostsFailure,
  attempt: number,
  delays: readonly number[] = RETRY_DELAYS_MS
): number => {
  const fallback = delays[attempt] ?? delays[delays.length - 1];
  if (failure.kind === 'error' && failure.retryAfterMs !== undefined) {
    return Math.min(failure.retryAfterMs, MAX_RETRY_AFTER_MS);
  }
  return fallback;
};

/**
 * 크론 전용: 일시적인 실패면 기다리는 시간을 늘려 가며 최대 3번 더 부른다.
 *
 * 왜 크론에만 두나: check-ai-billing 은 "어제 하루"만 보므로 그날 실패하면 그날의
 * 예산 기준선 알림은 다시 오지 않는다. 어드민 화면은 새로고침하면 되니 기다리게 하지 않는다.
 * GET 조회라 여러 번 불러도 부작용이 없다(멱등) — 그래서 재시도해도 안전하다.
 *
 * 왜 3초 한 번에서 바꿨나: 2026-11-16 00:30 UTC 에 첫 요청·3초 뒤 재시도 모두 429.
 * 같은 키로 낮에 부르면 성공 → 그 시각 한정 한도로 보고 더 오래, 여러 번 기다린다.
 */
export async function fetchOpenAiCostsWithRetry(
  now: Date,
  {
    delaysMs = RETRY_DELAYS_MS,
    sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  }: {
    delaysMs?: readonly number[];
    sleep?: (ms: number) => Promise<unknown>;
  } = {}
): Promise<OpenAiCostsResult> {
  let result = await fetchOpenAiCosts(now);

  for (let attempt = 0; attempt < delaysMs.length; attempt++) {
    if (result.ok || !isRetryableCostsFailure(result.failure)) return result;

    const waitMs = nextRetryDelayMs(result.failure, attempt, delaysMs);
    console.warn(
      `OpenAI 청구액 조회 재시도 ${attempt + 1}/${delaysMs.length} (${waitMs}ms 뒤): ${describeCostsFailure(result.failure)}`
    );
    await sleep(waitMs);
    result = await fetchOpenAiCosts(now);
  }

  return result;
}
