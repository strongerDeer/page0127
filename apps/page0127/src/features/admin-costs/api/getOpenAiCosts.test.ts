import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  describeCostsFailure,
  fetchOpenAiCostsWithRetry,
  getOpenAiCosts,
  isRetryableCostsFailure,
  nextRetryDelayMs,
} from './getOpenAiCosts';

vi.mock('@/shared/lib/admin/assertAdmin', () => ({
  assertAdmin: vi.fn(async () => undefined),
}));

const NOW = new Date('2026-10-18T03:00:00Z');
const OCT1 = 1790812800;

const page = (
  buckets: { start_time: number; value: number }[],
  next: string | null
) => ({
  object: 'page',
  data: buckets.map((b) => ({
    object: 'bucket',
    start_time: b.start_time,
    end_time: b.start_time + 86400,
    results: [{ amount: { value: b.value, currency: 'usd' } }],
  })),
  has_more: next !== null,
  next_page: next,
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getOpenAiCosts', () => {
  it('관리자 키가 없으면 부르지 않고 no-key — 화면은 앱 기록만 보여 준다', async () => {
    vi.stubEnv('OPENAI_ADMIN_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await getOpenAiCosts(NOW)).toEqual({
      ok: false,
      failure: { kind: 'no-key' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('관리자 키로 부르고, 다음 쪽(next_page)까지 이어 합친다', async () => {
    vi.stubEnv('OPENAI_ADMIN_KEY', 'sk-admin-test');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        json(page([{ start_time: OCT1, value: 0.01 }], 'p2'))
      )
      .mockResolvedValueOnce(
        json(page([{ start_time: OCT1 + 86400, value: 0.02 }], null))
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await getOpenAiCosts(NOW);
    expect(result).toEqual({
      ok: true,
      costs: {
        totalCents: 3,
        daily: [
          { date: '2026-10-01', cents: 1 },
          { date: '2026-10-02', cents: 2 },
        ],
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [firstUrl, init] = fetchMock.mock.calls[0];
    expect(String(firstUrl)).not.toContain('page=');
    expect(String(fetchMock.mock.calls[1][0])).toContain('page=p2');
    expect(init.headers.Authorization).toBe('Bearer sk-admin-test');
  });

  it('401·403 은 권한 문제(일반 키를 넣었거나 권한 없는 관리자 키)', async () => {
    vi.stubEnv('OPENAI_ADMIN_KEY', 'sk-proj-wrong');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 401)));
    expect(await getOpenAiCosts(NOW)).toEqual({
      ok: false,
      failure: { kind: 'forbidden' },
    });
  });

  it('그 밖의 실패·네트워크 오류는 error — 예외를 던지지 않는다', async () => {
    vi.stubEnv('OPENAI_ADMIN_KEY', 'sk-admin-test');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 500)));
    expect(await getOpenAiCosts(NOW)).toEqual({
      ok: false,
      failure: { kind: 'error', status: 500 },
    });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    expect(await getOpenAiCosts(NOW)).toEqual({
      ok: false,
      failure: { kind: 'error' },
    });
  });
});

describe('실패 응답 해석', () => {
  it('429 본문의 error.code 와 Retry-After(초)를 담는다', async () => {
    vi.stubEnv('OPENAI_ADMIN_KEY', 'sk-admin-test');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: { code: 'rate_limit_exceeded' } }),
            { status: 429, headers: { 'retry-after': '7' } }
          )
        )
    );
    expect(await getOpenAiCosts(NOW)).toEqual({
      ok: false,
      failure: {
        kind: 'error',
        status: 429,
        code: 'rate_limit_exceeded',
        retryAfterMs: 7000,
      },
    });
  });

  it('본문이 JSON 이 아니어도 status 는 남긴다', async () => {
    vi.stubEnv('OPENAI_ADMIN_KEY', 'sk-admin-test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('busy', { status: 503 }))
    );
    expect(await getOpenAiCosts(NOW)).toEqual({
      ok: false,
      failure: { kind: 'error', status: 503 },
    });
  });
});

describe('isRetryableCostsFailure', () => {
  it('429·5xx·네트워크 오류만 다시 부른다', () => {
    expect(isRetryableCostsFailure({ kind: 'error', status: 429 })).toBe(true);
    expect(isRetryableCostsFailure({ kind: 'error', status: 503 })).toBe(true);
    expect(isRetryableCostsFailure({ kind: 'error' })).toBe(true);
  });

  it('권한·키 없음·잘못된 요청·잔액 소진은 기다려도 같으니 재시도하지 않는다', () => {
    expect(isRetryableCostsFailure({ kind: 'forbidden' })).toBe(false);
    expect(isRetryableCostsFailure({ kind: 'no-key' })).toBe(false);
    expect(isRetryableCostsFailure({ kind: 'error', status: 400 })).toBe(false);
    expect(
      isRetryableCostsFailure({
        kind: 'error',
        status: 429,
        code: 'insufficient_quota',
      })
    ).toBe(false);
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
        code: 'rate_limit_exceeded',
      })
    ).toBe('error(status 429, rate_limit_exceeded)');
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

describe('fetchOpenAiCostsWithRetry', () => {
  const noSleep = vi.fn(async () => undefined);

  it('429 두 번 뒤 세 번째에 성공하면 성공으로 돌려준다', async () => {
    vi.stubEnv('OPENAI_ADMIN_KEY', 'sk-admin-test');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({}, 429))
      .mockResolvedValueOnce(json({}, 429))
      .mockResolvedValueOnce(
        json(page([{ start_time: OCT1, value: 0.01 }], null))
      );
    vi.stubGlobal('fetch', fetchMock);
    const sleep = vi.fn(async () => undefined);

    const result = await fetchOpenAiCostsWithRetry(NOW, {
      delaysMs: [5_000, 15_000, 30_000],
      sleep,
    });
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[5_000], [15_000]]);
  });

  it('재시도는 표 길이(3번)까지만 — 계속 실패하면 마지막 실패를 돌려준다', async () => {
    vi.stubEnv('OPENAI_ADMIN_KEY', 'sk-admin-test');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockImplementation(async () => json({}, 503));
    vi.stubGlobal('fetch', fetchMock);

    expect(
      await fetchOpenAiCostsWithRetry(NOW, {
        delaysMs: [1, 1, 1],
        sleep: noSleep,
      })
    ).toEqual({ ok: false, failure: { kind: 'error', status: 503 } });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('401·403 과 insufficient_quota 는 다시 부르지 않는다', async () => {
    vi.stubEnv('OPENAI_ADMIN_KEY', 'sk-admin-test');
    const fetchMock = vi.fn().mockResolvedValue(json({}, 403));
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchOpenAiCostsWithRetry(NOW, { sleep: noSleep })).toEqual({
      ok: false,
      failure: { kind: 'forbidden' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const quotaMock = vi
      .fn()
      .mockResolvedValue(json({ error: { code: 'insufficient_quota' } }, 429));
    vi.stubGlobal('fetch', quotaMock);
    expect(await fetchOpenAiCostsWithRetry(NOW, { sleep: noSleep })).toEqual({
      ok: false,
      failure: { kind: 'error', status: 429, code: 'insufficient_quota' },
    });
    expect(quotaMock).toHaveBeenCalledTimes(1);
  });
});
