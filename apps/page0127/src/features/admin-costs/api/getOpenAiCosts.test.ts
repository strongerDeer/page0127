import { afterEach, describe, expect, it, vi } from 'vitest';

import { getOpenAiCosts } from './getOpenAiCosts';

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
