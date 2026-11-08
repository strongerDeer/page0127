import { NextRequest, NextResponse } from 'next/server';

import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  updateSession: vi.fn(),
  checkApiRateLimit: vi.fn(),
}));
vi.mock('@/shared/config/supabase/middleware', () => ({
  updateSession: mocks.updateSession,
}));
vi.mock('@/shared/lib/rate-limit', () => ({
  checkApiRateLimit: mocks.checkApiRateLimit,
}));

import { proxy } from '../proxy';

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe('proxy에서 다른 응답을 반환할 때의 세션', () => {
  it('레이트 리밋 응답에도 갱신 쿠키와 캐시 금지 헤더를 유지한다', async () => {
    vi.stubEnv('HERO_AB', 'off');
    const response = NextResponse.next();
    response.cookies.set('sb-test-auth-token', 'rotated', {
      path: '/',
      maxAge: 100,
    });
    response.headers.set('Cache-Control', 'private, no-store');
    mocks.updateSession.mockResolvedValue({ response, user: { id: 'reader' } });
    mocks.checkApiRateLimit.mockResolvedValue(
      NextResponse.json({ error: 'limit' }, { status: 429 })
    );
    const result = await proxy(
      new NextRequest('https://page0127.com/api/books')
    );
    expect(result.status).toBe(429);
    expect(result.cookies.get('sb-test-auth-token')?.value).toBe('rotated');
    expect(result.headers.get('Cache-Control')).toContain('no-store');
  });

  it('인증 확인 장애 응답을 다른 응답으로 덮지 않는다', async () => {
    const response = NextResponse.json(
      { error: 'unavailable' },
      { status: 503 }
    );
    mocks.updateSession.mockResolvedValue({ response, user: null });
    expect(
      await proxy(new NextRequest('https://page0127.com/api/auth/me'))
    ).toBe(response);
    expect(mocks.checkApiRateLimit).not.toHaveBeenCalled();
  });
});
