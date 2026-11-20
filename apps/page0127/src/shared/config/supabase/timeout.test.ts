import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTimeoutFetch, DB_TIMEOUT_MARKER } from './timeout';

// signal 이 끊기면 그 reason 으로 거절하는 가짜 fetch — 실제 fetch 와 같은 동작
const hangingFetch = (_input: RequestInfo | URL, init?: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    if (init?.signal?.aborted) return reject(init.signal.reason);
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
  });

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const REST_URL = 'https://x.supabase.co/rest/v1/hero_slides';

describe('createTimeoutFetch', () => {
  it('상한에 걸리면 이름은 AbortError, 메시지에 db-timeout 표식이 실린다', async () => {
    vi.stubGlobal('fetch', vi.fn(hangingFetch));
    const timeoutFetch = createTimeoutFetch({ dbMs: 5, retryMs: 5 });

    const error = await timeoutFetch(
      'https://x.supabase.co/rest/v1/books'
    ).catch((e: unknown) => e);

    // postgrest-js 재시도 가드가 name 으로 판정한다 — 바뀌면 상한이 무너진다
    expect((error as DOMException).name).toBe('AbortError');
    expect((error as DOMException).message).toContain(DB_TIMEOUT_MARKER);
  });

  it('읽기가 상한에 걸리면 새 연결로 한 번 더 보내고, 그 응답을 돌려준다', async () => {
    // 첫 요청은 죽은 연결처럼 매달리고, 두 번째는 바로 온다
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(hangingFetch)
      .mockResolvedValueOnce(new Response('[]', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await createTimeoutFetch({ dbMs: 5, retryMs: 50 })(REST_URL);

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('다시 보내도 안 오면 한 번만 더 시도하고 db-timeout 으로 끊는다', async () => {
    const fetchMock = vi.fn(hangingFetch);
    vi.stubGlobal('fetch', fetchMock);

    const error = await createTimeoutFetch({ dbMs: 5, retryMs: 5 })(
      REST_URL
    ).catch((e: unknown) => e);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((error as DOMException).name).toBe('AbortError');
    expect((error as DOMException).message).toContain(DB_TIMEOUT_MARKER);
  });

  it('POST(rpc)는 두 번 반영될 수 있어 다시 보내지 않는다', async () => {
    const fetchMock = vi.fn(hangingFetch);
    vi.stubGlobal('fetch', fetchMock);

    await createTimeoutFetch({ dbMs: 5, retryMs: 5 })(
      'https://x.supabase.co/rest/v1/rpc/increment_rate_limit',
      { method: 'POST' }
    ).catch(() => {});

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('인증 요청은 다시 보내지 않는다', async () => {
    const fetchMock = vi.fn(hangingFetch);
    vi.stubGlobal('fetch', fetchMock);

    await createTimeoutFetch({ authMs: 5, retryMs: 5 })(
      'https://x.supabase.co/auth/v1/user'
    ).catch(() => {});

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('호출자가 취소한 요청은 다시 보내지 않는다', async () => {
    const fetchMock = vi.fn(hangingFetch);
    vi.stubGlobal('fetch', fetchMock);
    const caller = new AbortController();
    caller.abort(new DOMException('user left', 'AbortError'));

    await createTimeoutFetch({ dbMs: 5, retryMs: 5 })(REST_URL, {
      signal: caller.signal,
    }).catch(() => {});

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
