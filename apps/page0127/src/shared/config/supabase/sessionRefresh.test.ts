import { NextRequest } from 'next/server';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { updateSession } from './middleware';

// Exercise the installed SSR/Auth SDK, including its real cookie serialization.
// Only the Auth HTTP server is replaced; no real user credentials are used.
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('만료된 로그인으로 PWA를 다시 여는 경우', () => {
  it('refresh token을 갱신하고 영속 쿠키로 저장해 다음 요청에서 재사용한다', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
    const now = Math.floor(Date.now() / 1000);
    const user = {
      id: '00000000-0000-0000-0000-000000000001',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'reader@example.com',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    };
    const jwt = (exp: number) =>
      [
        Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
          'base64url'
        ),
        Buffer.from(
          JSON.stringify({
            sub: user.id,
            exp,
            iat: now - 3600,
            role: 'authenticated',
          })
        ).toString('base64url'),
        'test-signature',
      ].join('.');
    const expired = {
      access_token: jwt(now - 60),
      refresh_token: 'old-test-refresh',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: now - 60,
      user,
    };
    const fresh = {
      access_token: jwt(now + 3600),
      refresh_token: 'new-test-refresh',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: now + 3600,
      user,
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (url.includes('/auth/v1/token?grant_type=refresh_token'))
        return Response.json(fresh);
      if (url.endsWith('/auth/v1/user')) return Response.json(user);
      throw new Error('Unexpected Auth request');
    });
    vi.stubGlobal('fetch', fetchMock);
    const encoded = `base64-${Buffer.from(JSON.stringify(expired)).toString('base64url')}`;
    const first = await updateSession(
      new NextRequest('https://page0127.com/settings', {
        headers: { Cookie: `sb-example-auth-token=${encoded}` },
      })
    );
    expect(first.user?.id).toBe(user.id);
    expect(first.response.status).toBe(200);
    const stored = first.response.cookies.get('sb-example-auth-token')!;
    expect(stored.maxAge).toBeGreaterThan(86400);
    expect(stored.sameSite).toBe('lax');
    const decoded = JSON.parse(
      Buffer.from(stored.value.slice('base64-'.length), 'base64url').toString()
    );
    expect(decoded.refresh_token).toBe('new-test-refresh');
    expect(first.response.headers.get('Cache-Control')).toContain('no-store');

    const nextCookie = first.response.headers.get(
      'x-middleware-request-cookie'
    )!;
    const second = await updateSession(
      new NextRequest('https://page0127.com/settings', {
        headers: { Cookie: nextCookie },
      })
    );
    expect(second.user?.id).toBe(user.id);
    expect(second.response.headers.get('Location')).toBeNull();
    expect(
      fetchMock.mock.calls.filter(([input]) =>
        String(input).includes('grant_type=refresh_token')
      )
    ).toHaveLength(1);
  });
});
