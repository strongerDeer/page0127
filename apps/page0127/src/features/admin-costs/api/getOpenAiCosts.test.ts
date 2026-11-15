import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  describeCostsFailure,
  fetchOpenAiCostsWithRetry,
  getOpenAiCosts,
  isRetryableCostsFailure,
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

describe('isRetryableCostsFailure', () => {
  it('429·5xx·네트워크 오류만 다시 부른다', () => {
    expect(isRetryableCostsFailure({ kind: 'error', status: 429 })).toBe(true);
    expect(isRetryableCostsFailure({ kind: 'error', status: 503 })).toBe(true);
    expect(isRetryableCostsFailure({ kind: 'error' })).toBe(true);
  });

  it('권한·키 없음·잘못된 요청은 다시 불러도 같으니 재시도하지 않는다', () => {
    expect(isRetryableCostsFailure({ kind: 'forbidden' })).toBe(false);
    expect(isRetryableCostsFailure({ kind: 'no-key' })).toBe(false);
    expect(isRetryableCostsFailure({ kind: 'error', status: 400 })).toBe(false);
  });
});

describe('describeCostsFailure', () => {
  it('로그에서 원인을 가를 수 있게 status 까지 적는다', () => {
    expect(describeCostsFailure({ kind: 'error', status: 503 })).toBe(
      'error(status 503)'
    );
    expect(describeCostsFailure({ kind: 'error' })).toBe('error(network)');
    expect(describeCostsFailure({ kind: 'forbidden' })).toBe('forbidden');
  });
});

describe('fetchOpenAiCostsWithRetry', () => {
  it('5xx 뒤 한 번 더 불러서 성공하면 성공으로 돌려준다', async () => {
    vi.stubEnv('OPENAI_ADMIN_KEY', 'sk-admin-test');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(
        json(page([{ start_time: OCT1, value: 0.01 }], null))
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchOpenAiCostsWithRetry(NOW, { retryDelayMs: 0 });
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('재시도는 한 번뿐 — 또 실패하면 그 실패를 돌려준다', async () => {
    vi.stubEnv('OPENAI_ADMIN_KEY', 'sk-admin-test');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue(json({}, 429));
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchOpenAiCostsWithRetry(NOW, { retryDelayMs: 0 })).toEqual({
      ok: false,
      failure: { kind: 'error', status: 429 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('401·403 은 다시 부르지 않는다', async () => {
    vi.stubEnv('OPENAI_ADMIN_KEY', 'sk-admin-test');
    const fetchMock = vi.fn().mockResolvedValue(json({}, 403));
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchOpenAiCostsWithRetry(NOW, { retryDelayMs: 0 })).toEqual({
      ok: false,
      failure: { kind: 'forbidden' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
