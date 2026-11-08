import { NextRequest } from 'next/server';

import {
  AuthRetryableFetchError,
  AuthSessionMissingError,
} from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock('@supabase/ssr', () => ({
  createServerClient: mocks.createServerClient,
}));

import { updateSession } from './middleware';

import type { CookieMethodsServer } from '@supabase/ssr';

const authHeaders = {
  'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
  Expires: '0',
  Pragma: 'no-cache',
};
const cookies = () =>
  (
    mocks.createServerClient.mock.calls[0][2] as {
      cookies: CookieMethodsServer;
    }
  ).cookies;
const request = (path = '/settings') =>
  new NextRequest(`https://page0127.com${path}`, {
    headers: { Cookie: 'sb-test-auth-token=old-token; unrelated=keep' },
  });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.createServerClient.mockReturnValue({
    auth: { getUser: mocks.getUser },
  });
  mocks.getUser.mockResolvedValue({
    data: { user: { id: 'reader' } },
    error: null,
  });
});

describe('PWA 세션 갱신 응답', () => {
  it('갱신 토큰을 같은 요청의 RSC와 브라우저 응답 모두에 전달한다', async () => {
    mocks.getUser.mockImplementationOnce(async () => {
      await cookies().setAll!(
        [
          {
            name: 'sb-test-auth-token',
            value: 'rotated-token',
            options: { path: '/', maxAge: 34560000, sameSite: 'lax' },
          },
        ],
        authHeaders
      );
      return { data: { user: { id: 'reader' } }, error: null };
    });
    const { response, user } = await updateSession(request());
    expect(user?.id).toBe('reader');
    expect(response.headers.get('x-middleware-request-cookie')).toContain(
      'sb-test-auth-token=rotated-token'
    );
    expect(response.headers.get('x-middleware-request-cookie')).toContain(
      'unrelated=keep'
    );
    expect(response.cookies.get('sb-test-auth-token')).toMatchObject({
      value: 'rotated-token',
      maxAge: 34560000,
    });
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(response.headers.get('Pragma')).toBe('no-cache');
  });

  it('setAll이 여러 번 호출되어도 이전 쿠키와 캐시 금지 헤더를 유지한다', async () => {
    mocks.getUser.mockImplementationOnce(async () => {
      await cookies().setAll!(
        [{ name: 'first', value: 'one', options: { path: '/' } }],
        authHeaders
      );
      await cookies().setAll!(
        [{ name: 'second', value: 'two', options: { path: '/' } }],
        {}
      );
      return { data: { user: { id: 'reader' } }, error: null };
    });
    const { response } = await updateSession(request());
    expect(response.cookies.get('first')?.value).toBe('one');
    expect(response.cookies.get('second')?.value).toBe('two');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });

  it('인증 서버 장애는 로그인 리디렉션 대신 재시도 가능한 503으로 처리한다', async () => {
    const original = request();
    mocks.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new AuthRetryableFetchError('offline', 0),
    });
    const { response, user } = await updateSession(original);
    expect(user).toBeNull();
    expect(response.status).toBe(503);
    expect(response.headers.get('Location')).toBeNull();
    expect(response.headers.get('Retry-After')).toBe('3');
    expect(original.cookies.get('sb-test-auth-token')?.value).toBe('old-token');
    expect(response.cookies.getAll()).toEqual([]);
    expect(response.headers.get('Content-Type')).toContain('text/html');
    expect(await response.text()).toContain('다시 시도');
  });

  it('API 인증 확인 장애는 HTML 대신 503 JSON으로 반환한다', async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new AuthRetryableFetchError('offline', 0),
    });
    const { response } = await updateSession(request('/api/auth/me'));
    expect(response.status).toBe(503);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(await response.json()).toHaveProperty('error');
  });

  it('진짜 비로그인 리디렉션에도 세션 제거 쿠키를 보존한다', async () => {
    mocks.getUser.mockImplementationOnce(async () => {
      await cookies().setAll!(
        [
          {
            name: 'sb-test-auth-token',
            value: '',
            options: { path: '/', maxAge: 0 },
          },
        ],
        authHeaders
      );
      return { data: { user: null }, error: new AuthSessionMissingError() };
    });
    const { response } = await updateSession(request('/settings?tab=profile'));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('Location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('redirect')).toBe('/settings?tab=profile');
    expect(response.cookies.get('sb-test-auth-token')).toMatchObject({
      value: '',
      maxAge: 0,
    });
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });

  it('비로그인 방문자의 공개 페이지는 그대로 통과시킨다', async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new AuthSessionMissingError(),
    });
    expect((await updateSession(request('/'))).response.status).toBe(200);
  });
});
