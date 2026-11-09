import { NextRequest } from 'next/server';

import { createClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAdminClient } from '@/shared/config/supabase/admin';

import { checkApiRateLimit } from './index';

vi.mock('@/shared/config/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

const request = (path = '/api/notifications/unread-count') =>
  new NextRequest(`https://example.com${path}`);

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  // 실제 SDK를 통해 RPC 요청 취소가 동작하는지 검증한다.
  vi.mocked(createAdminClient).mockImplementation(() =>
    createClient('https://example.supabase.co', 'test-service-role-key', {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.mocked(createAdminClient).mockReset();
});

describe('checkApiRateLimit', () => {
  it('응답이 없으면 1초에 HTTP 요청을 취소하고 요청을 통과시킨다', async () => {
    let signal: AbortSignal | undefined;
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(signal?.reason));
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    let settled = false;
    const result = checkApiRateLimit(request(), null).then((value) => {
      settled = true;
      return value;
    });
    await vi.advanceTimersByTimeAsync(999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect(await result).toBeNull();
    expect(signal?.aborted).toBe(true);
    expect(signal?.reason.name).toBe('AbortError');
    // 시간 초과는 예상한 상황 — Sentry·카카오 알림으로 가는 error 가 아니라 warn 으로만 남긴다
    expect(console.warn).toHaveBeenCalledOnce();
    expect(console.error).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([
    { count: 1, status: undefined },
    { count: 61, status: 429 },
  ])(
    '정상 응답 count=$count 처리 후 타이머를 해제한다',
    async ({ count, status }) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(count)));

      const response = await checkApiRateLimit(request(), null);

      expect(response?.status).toBe(status);
      if (response) {
        expect(Number(response.headers.get('Retry-After'))).toBeGreaterThan(0);
      }
      expect(console.error).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    }
  );

  it('DB 오류도 재시도 없이 통과시키고 타이머를 해제한다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ message: 'unavailable' }, { status: 503 })
      );
    vi.stubGlobal('fetch', fetchMock);

    expect(await checkApiRateLimit(request(), null)).toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
    // 시간 초과가 아닌 진짜 실패는 그대로 error — 알림으로 받아야 한다
    expect(console.error).toHaveBeenCalledOnce();
    expect(console.warn).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('관리자 클라이언트 생성 실패 시에도 통과시키고 타이머를 해제한다', async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error('missing config');
    });

    expect(await checkApiRateLimit(request(), null)).toBeNull();
    expect(console.error).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('크론은 검사와 타이머를 생성하지 않는다', async () => {
    expect(
      await checkApiRateLimit(request('/api/cron/cleanup-rate-limits'), null)
    ).toBeNull();
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
