import Anthropic from '@anthropic-ai/sdk';

import { assertAdmin } from '@/shared/lib/admin/assertAdmin';

import {
  type AiCosts,
  type CostItem,
  costsRange,
  parseCostItems,
} from '../lib/aiCosts';

export type AiCostsFailure =
  | { kind: 'no-key' }
  | { kind: 'forbidden' }
  | {
      kind: 'error';
      status?: number;
      /** Anthropic 오류 본문의 error.type — 예: rate_limit_error, overloaded_error */
      code?: string;
      /** Retry-After 헤더(밀리초) — "이만큼 기다렸다 다시 와" 라고 알려 준 값 */
      retryAfterMs?: number;
    };

export type AiCostsResult =
  { ok: true; costs: AiCosts } | { ok: false; failure: AiCostsFailure };

/** 한 달 744시간 칸이 한 쪽(최대 1,000줄)에 다 들어오게 */
const PAGE_LIMIT = 1000;
/** 쪽 넘김이 끝없이 이어지는 것만 막는다 */
const MAX_ITEMS = PAGE_LIMIT * 3;
const REQUEST_TIMEOUT_MS = 20_000;

/**
 * 이번 달 Anthropic 실제 청구액(로컬·운영·테스트 전부 합친 조직 전체) — 어드민 화면용.
 *
 * 관리자 키(ANTHROPIC_ADMIN_KEY, sk-ant-admin…)가 있어야 한다 — 분석에 쓰는 일반 키로는 401/403.
 * getSentryIssues 와 같이 실패해도 예외를 던지지 않는다: 비용 화면의 다른 칸(앱 기록)은 살아 있어야 한다.
 */
export async function getAiCosts(now = new Date()): Promise<AiCostsResult> {
  await assertAdmin();
  // 어드민을 새로고침할 때마다 부르지 않게 — Sentry 조회와 같은 5분
  return fetchAiCosts(now, now, { next: { revalidate: 300 } });
}

/** Retry-After 는 초(숫자) 또는 HTTP 날짜로 온다 */
const parseRetryAfterMs = (value: string | null | undefined) => {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
};

/** SDK 오류 → 실패 사유. 401·403 은 키 문제, 나머지는 status·error.type·Retry-After 를 남긴다 */
const toFailure = (error: unknown): AiCostsFailure => {
  // 연결 오류·타임아웃은 status 가 없다 — 다시 불러 볼 만한 실패
  if (
    !(error instanceof Anthropic.APIError) ||
    error instanceof Anthropic.APIConnectionError ||
    error.status === undefined
  ) {
    return { kind: 'error' };
  }
  if (error.status === 401 || error.status === 403) {
    return { kind: 'forbidden' };
  }
  const body = error.error as { error?: { type?: unknown } } | undefined;
  const code =
    typeof body?.error?.type === 'string' ? body.error.type : undefined;
  const retryAfterMs = parseRetryAfterMs(error.headers?.get('retry-after'));
  return {
    kind: 'error',
    status: error.status,
    ...(code && { code }),
    ...(retryAfterMs !== undefined && { retryAfterMs }),
  };
};

/**
 * 관리자 확인 없이 청구액을 읽는다. **크론처럼 이미 다른 방법으로 인증된 서버 경로 전용.**
 * `month` 가 속한 달(KST) 1일부터 `now` 직전 정시(또는 그 달 끝)까지 읽는다.
 */
export async function fetchAiCosts(
  month: Date,
  now: Date = month,
  fetchOptions: Pick<RequestInit, 'cache' | 'next'> = { cache: 'no-store' }
): Promise<AiCostsResult> {
  const apiKey = process.env.ANTHROPIC_ADMIN_KEY;
  if (!apiKey) return { ok: false, failure: { kind: 'no-key' } };

  const range = costsRange(month, now);
  if (!range) return { ok: true, costs: { totalCents: 0, daily: [] } };

  // 재시도는 아래 크론용 함수가 직접 한다(대기 시간·횟수를 정해 두려고) — SDK 재시도는 끈다
  const client = new Anthropic({
    apiKey,
    maxRetries: 0,
    timeout: REQUEST_TIMEOUT_MS,
  });

  try {
    const items: CostItem[] = [];
    // 다음 쪽(next_page)은 SDK 가 같은 조건으로 이어서 불러 준다
    for await (const item of client.beta.organization.analytics.cost.list(
      {
        ...range,
        time_bucket_width: '1h',
        order_by: 'time',
        order: 'asc',
        limit: PAGE_LIMIT,
      },
      { fetchOptions }
    )) {
      items.push(item);
      if (items.length >= MAX_ITEMS) break;
    }
    return { ok: true, costs: parseCostItems(items) };
  } catch (error) {
    const failure = toFailure(error);
    if (failure.kind === 'error') console.error('Anthropic 비용 조회 실패');
    return { ok: false, failure };
  }
}

/**
 * 다시 불러 볼 만한 실패인가 — 429(잠깐 너무 많이 부름)·5xx(Anthropic 쪽 장애)·네트워크 오류(status 없음).
 *
 * 401·403(forbidden)·no-key 는 다시 불러도 결과가 같으니 재시도하지 않는다.
 * 400·404 같은 4xx 도 요청 자체가 잘못된 것이라 똑같이 실패한다.
 */
export const isRetryableCostsFailure = (failure: AiCostsFailure): boolean => {
  if (failure.kind !== 'error') return false;
  if (failure.status === undefined) return true;
  return failure.status === 429 || failure.status >= 500;
};

/** 로그·응답에 남길 실패 이유 — 다음에 알림이 오면 키 문제인지 Anthropic 장애인지 바로 보이게 */
export const describeCostsFailure = (failure: AiCostsFailure): string => {
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

/** 다음 대기 시간 — Retry-After 를 주면 그 값을 존중하고, 없으면 백오프 표를 따른다 */
export const nextRetryDelayMs = (
  failure: AiCostsFailure,
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
 */
export async function fetchAiCostsWithRetry(
  month: Date,
  now: Date,
  {
    delaysMs = RETRY_DELAYS_MS,
    sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  }: {
    delaysMs?: readonly number[];
    sleep?: (ms: number) => Promise<unknown>;
  } = {}
): Promise<AiCostsResult> {
  let result = await fetchAiCosts(month, now);

  for (let attempt = 0; attempt < delaysMs.length; attempt++) {
    if (result.ok || !isRetryableCostsFailure(result.failure)) return result;

    const waitMs = nextRetryDelayMs(result.failure, attempt, delaysMs);
    console.warn(
      `Anthropic 청구액 조회 재시도 ${attempt + 1}/${delaysMs.length} (${waitMs}ms 뒤): ${describeCostsFailure(result.failure)}`
    );
    await sleep(waitMs);
    result = await fetchAiCosts(month, now);
  }

  return result;
}
