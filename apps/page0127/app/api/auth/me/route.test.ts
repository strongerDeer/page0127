import { NextRequest } from 'next/server';

import {
  AuthRetryableFetchError,
  AuthSessionMissingError,
} from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock('../../_helpers/auth', () => ({
  getSupabaseClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));

import { GET } from './route';

const request = () => new NextRequest('https://page0127.com/api/auth/me');
afterEach(() => {
  vi.restoreAllMocks();
  mocks.getUser.mockReset();
});

describe('현재 사용자 API', () => {
  // A signed-out visitor remains a successful anonymous response, not an HTTP error.
  it('사용자가 없고 오류도 없으면 200 + null을 반환한다', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });

  it('인증 서버 오류를 200 + null로 숨기지 않는다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new AuthRetryableFetchError('offline', 0),
    });
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toHaveProperty('error');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(response.headers.get('Retry-After')).toBe('3');
  });

  it('정상적인 비로그인은 200 + null을 반환한다', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new AuthSessionMissingError(),
    });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });

  it('로그인 응답도 기기나 CDN에 저장하지 않는다', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'reader', email: 'reader@example.com' } },
      error: null,
    });
    const response = await GET(request());
    expect(await response.json()).toEqual({
      id: 'reader',
      email: 'reader@example.com',
    });
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
});
