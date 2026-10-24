import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTimeoutFetch, DB_TIMEOUT_MARKER } from './timeout';

// signal 이 끊기면 그 reason 으로 거절하는 가짜 fetch — 실제 fetch 와 같은 동작
const hangingFetch = (_input: RequestInfo | URL, init?: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
  });

afterEach(() => vi.unstubAllGlobals());

describe('createTimeoutFetch', () => {
  it('상한에 걸리면 이름은 AbortError, 메시지에 db-timeout 표식이 실린다', async () => {
    vi.stubGlobal('fetch', vi.fn(hangingFetch));
    const timeoutFetch = createTimeoutFetch({ dbMs: 5 });

    const error = await timeoutFetch(
      'https://x.supabase.co/rest/v1/books'
    ).catch((e: unknown) => e);

    // postgrest-js 재시도 가드가 name 으로 판정한다 — 바뀌면 상한이 무너진다
    expect((error as DOMException).name).toBe('AbortError');
    expect((error as DOMException).message).toContain(DB_TIMEOUT_MARKER);
  });
});
