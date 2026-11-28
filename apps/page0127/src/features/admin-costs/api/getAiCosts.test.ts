import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  describeCostsFailure,
  fetchAiCostsWithRetry,
  getAiCosts,
  isRetryableCostsFailure,
  nextRetryDelayMs,
} from './getAiCosts';

vi.mock('@/shared/lib/admin/assertAdmin', () => ({
  assertAdmin: vi.fn(async () => undefined),
}));

// 2026-11-18 12:00 KST
const NOW = new Date('2026-11-18T03:00:00Z');

/** 비용 분석 API 한 쪽 — 시간 버킷마다 금액(센트 문자열) */
const page = (
  rows: { starting_at: string; amount: string }[],
  next: string | null
) => ({
  data: rows.map((row) => ({
    starting_at: row.starting_at,
    ending_at: row.starting_at,
    group: {},
    cost: {
      amount: row.amount,
      list_amount: row.amount,
      currency: 'USD',
      requests: 1,
    },
  })),
  has_more: next !== null,
  next_page: next,
  data_refreshed_at: '2026-11-18T00:00:00Z',
});

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

const apiError = (status: number, type: string, headers?: HeadersInit) =>
  json({ type: 'error', error: { type, message: type } }, status, headers);

const requestUrl = (call: unknown[]) =>
  new URL(call[0] instanceof Request ? call[0].url : String(call[0]));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getAiCosts', () => {
  it('관리자 키가 없으면 부르지 않고 no-key — 화면은 앱 기록만 보여 준다', async () => {
    vi.stubEnv('ANTHROPIC_ADMIN_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await getAiCosts(NOW)).toEqual({
      ok: false,
      failure: { kind: 'no-key' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('이번 달(KST)을 시간 단위로 읽고, 다음 쪽까지 이어 KST 날짜로 합친다', async () => {
    vi.stubEnv('ANTHROPIC_ADMIN_KEY', 'sk-ant-admin-test');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json(page([{ starting_at: '2026-11-01T03:00:00Z', amount: '1' }], 'p2'))
      )
      .mockResolvedValueOnce(
        json(page([{ starting_at: '2026-11-02T03:00:00Z', amount: '2' }], null))
      );
    vi.stubGlobal('fetch', fetchMock);

    expect(await getAiCosts(NOW)).toEqual({
      ok: true,
      costs: {
        totalCents: 3,
        daily: [
          { date: '2026-11-01', cents: 1 },
          { date: '2026-11-02', cents: 2 },
        ],
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const first = requestUrl(fetchMock.mock.calls[0]);
    expect(first.pathname).toBe('/v1/organizations/analytics/cost');
    expect(first.searchParams.get('starting_at')).toBe(
      '2026-10-31T15:00:00.000Z'
    );
    expect(first.searchParams.get('ending_at')).toBe(
      '2026-11-18T03:00:00.000Z'
    );
    expect(first.searchParams.get('time_bucket_width')).toBe('1h');
    expect(requestUrl(fetchMock.mock.calls[1]).searchParams.get('page')).toBe(
      'p2'
    );
  });

  it('401·403 은 권한 문제(분석용 일반 키를 넣은 경우 등)', async () => {
    vi.stubEnv('ANTHROPIC_ADMIN_KEY', 'sk-ant-api-wrong');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(apiError(401, 'authentication_error'))
    );
    expect(await getAiCosts(NOW)).toEqual({
      ok: false,
      failure: { kind: 'forbidden' },
    });
  });

  it('그 밖의 실패·네트워크 오류는 error — 예외를 던지지 않는다', async () => {
    vi.stubEnv('ANTHROPIC_ADMIN_KEY', 'sk-ant-admin-test');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(apiError(500, 'api_error'))
    );
    expect(await getAiCosts(NOW)).toEqual({
      ok: false,
      failure: { kind: 'error', status: 500, code: 'api_error' },
    });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    expect(await getAiCosts(NOW)).toEqual({
      ok: false,
      failure: { kind: 'error' },
    });
  });

  it('429 는 error.type 과 Retry-After(초)를 담는다', async () => {
    vi.stubEnv('ANTHROPIC_ADMIN_KEY', 'sk-ant-admin-test');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          apiError(429, 'rate_limit_error', { 'retry-after': '7' })
        )
    );
    expect(await getAiCosts(NOW)).toEqual({
      ok: false,
      failure: {
        kind: 'error',
        status: 429,
        code: 'rate_limit_error',
        retryAfterMs: 7000,
      },
    });
  });
});

describe('isRetryableCostsFailure', () => {
  it('429·5xx·네트워크 오류만 다시 부른다', () => {
    expect(isRetryableCostsFailure({ kind: 'error', status: 429 })).toBe(true);
    expect(isRetryableCostsFailure({ kind: 'error', status: 529 })).toBe(true);
    expect(isRetryableCostsFailure({ kind: 'error' })).toBe(true);
  });

  it('권한·키 없음·잘못된 요청은 기다려도 같으니 재시도하지 않는다', () => {
    expect(isRetryableCostsFailure({ kind: 'forbidden' })).toBe(false);
    expect(isRetryableCostsFailure({ kind: 'no-key' })).toBe(false);
    expect(isRetryableCostsFailure({ kind: 'error', status: 400 })).toBe(false);
  });
});

describe('describeCostsFailure', () => {
  it('로그에서 원인을 가를 수 있게 status·code 까지 적는다', () => {
    expect(describeCostsFailure({ kind: 'error', status: 503 })).toBe(
      'error(status 503)'
    );
    expect(
      describeCostsFailure({
        kind: 'error',
        status: 429,
        code: 'rate_limit_error',
      })
    ).toBe('error(status 429, rate_limit_error)');
    expect(describeCostsFailure({ kind: 'error' })).toBe('error(network)');
    expect(describeCostsFailure({ kind: 'forbidden' })).toBe('forbidden');
  });
});

describe('nextRetryDelayMs', () => {
  const delays = [5_000, 15_000, 30_000];

  it('Retry-After 가 없으면 백오프 표(5초 → 15초 → 30초)를 따른다', () => {
    const failure = { kind: 'error', status: 429 } as const;
    expect(nextRetryDelayMs(failure, 0, delays)).toBe(5_000);
    expect(nextRetryDelayMs(failure, 1, delays)).toBe(15_000);
    expect(nextRetryDelayMs(failure, 2, delays)).toBe(30_000);
  });

  it('Retry-After 를 존중하되 30초를 넘기지 않는다', () => {
    expect(
      nextRetryDelayMs(
        { kind: 'error', status: 429, retryAfterMs: 2_000 },
        0,
        delays
      )
    ).toBe(2_000);
    expect(
      nextRetryDelayMs(
        { kind: 'error', status: 429, retryAfterMs: 600_000 },
        0,
        delays
      )
    ).toBe(30_000);
  });
});

describe('fetchAiCostsWithRetry', () => {
  const noSleep = vi.fn(async () => undefined);

  it('429 두 번 뒤 세 번째에 성공하면 성공으로 돌려준다', async () => {
    vi.stubEnv('ANTHROPIC_ADMIN_KEY', 'sk-ant-admin-test');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(apiError(429, 'rate_limit_error'))
      .mockResolvedValueOnce(apiError(429, 'rate_limit_error'))
      .mockResolvedValueOnce(
        json(page([{ starting_at: '2026-11-01T03:00:00Z', amount: '1' }], null))
      );
    vi.stubGlobal('fetch', fetchMock);
    const sleep = vi.fn(async () => undefined);

    const result = await fetchAiCostsWithRetry(NOW, NOW, {
      delaysMs: [5_000, 15_000, 30_000],
      sleep,
    });
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[5_000], [15_000]]);
  });

  it('재시도는 표 길이(3번)까지만 — 계속 실패하면 마지막 실패를 돌려준다', async () => {
    vi.stubEnv('ANTHROPIC_ADMIN_KEY', 'sk-ant-admin-test');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => apiError(503, 'overloaded_error'));
    vi.stubGlobal('fetch', fetchMock);

    expect(
      await fetchAiCostsWithRetry(NOW, NOW, {
        delaysMs: [1, 1, 1],
        sleep: noSleep,
      })
    ).toEqual({
      ok: false,
      failure: { kind: 'error', status: 503, code: 'overloaded_error' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('401·403 은 다시 부르지 않는다', async () => {
    vi.stubEnv('ANTHROPIC_ADMIN_KEY', 'sk-ant-admin-test');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(apiError(403, 'permission_error'));
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchAiCostsWithRetry(NOW, NOW, { sleep: noSleep })).toEqual({
      ok: false,
      failure: { kind: 'forbidden' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
