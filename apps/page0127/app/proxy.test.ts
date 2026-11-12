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

import { config, proxy } from '../proxy';

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

describe('proxy matcher — 정적 파일에는 proxy(세션 확인)를 태우지 않는다', () => {
  // Next 는 matcher 문자열을 path-to-regexp 로 바꿔 쓰지만, 이 패턴은 "/(...)" 하나뿐이라
  // 앞의 "/" 를 붙인 정규식으로 같은 판정을 재현할 수 있다.
  const [pattern] = config.matcher;
  const matches = (path: string) => new RegExp(`^${pattern}$`).test(path);

  it.each([
    '/badges/editorial/sized/story-art-v3-640.avif',
    '/badges/editorial/cover-sans.woff2',
    '/images/hero.webp',
    '/brand/logo.svg',
    '/favicon.ico',
    '/_next/static/chunks/main.js',
    '/sw.js',
    // 책 정보는 CDN 캐시 페이지 — proxy 가 돌면 캐시를 줘도 함수가 깨어난다
    '/books/info/abc-123',
    '/books/info/abc-123/opengraph-image-1ram65',
  ])('%s 는 건너뛴다', (path) => {
    expect(matches(path)).toBe(false);
  });

  it.each([
    '/',
    '/books/all',
    '/books/mine/abc-123',
    '/stronger_khj',
    '/api/auth/me',
    '/api/books/info/9788936434120/me',
  ])('%s 는 태운다', (path) => {
    expect(matches(path)).toBe(true);
  });
});
