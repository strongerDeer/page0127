import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  isDemoBlockedRequest,
  isDemoLoginEnabled,
  isDemoUser,
} from './demoAccount';

describe('isDemoUser', () => {
  it('app_metadata.demo 가 true 일 때만 체험 계정이다', () => {
    expect(isDemoUser({ app_metadata: { demo: true } })).toBe(true);
    expect(isDemoUser({ app_metadata: { demo: 'true' } })).toBe(false);
    expect(isDemoUser({ app_metadata: {} })).toBe(false);
    expect(isDemoUser(null)).toBe(false);
    expect(isDemoUser(undefined)).toBe(false);
  });

  it('user_metadata 는 사용자가 바꿀 수 있으므로 보지 않는다', () => {
    const user = {
      app_metadata: {},
      user_metadata: { demo: true },
    };
    expect(isDemoUser(user)).toBe(false);
  });
});

describe('isDemoBlockedRequest', () => {
  it('읽기 요청은 막지 않는다', () => {
    expect(
      isDemoBlockedRequest({ method: 'GET', pathname: '/api/books' })
    ).toBe(false);
    expect(
      isDemoBlockedRequest({ method: 'head', pathname: '/api/feed' })
    ).toBe(false);
  });

  it('/api 쓰기는 막는다', () => {
    expect(
      isDemoBlockedRequest({ method: 'POST', pathname: '/api/books' })
    ).toBe(true);
    expect(
      isDemoBlockedRequest({ method: 'DELETE', pathname: '/api/auth/account' })
    ).toBe(true);
    expect(
      isDemoBlockedRequest({
        method: 'POST',
        pathname: '/api/taste-analysis/analyze',
      })
    ).toBe(true);
    expect(
      isDemoBlockedRequest({ method: 'PATCH', pathname: '/api/books/abc' })
    ).toBe(true);
  });

  it('측정·읽음 표시 같은 쓰기는 열어 둔다', () => {
    for (const pathname of [
      '/api/rum',
      '/api/visit',
      '/api/auth/demo',
      '/api/banners/slide-1/click',
      '/api/books/abc/thread-read',
    ]) {
      expect(isDemoBlockedRequest({ method: 'POST', pathname })).toBe(false);
    }
  });

  it('허용 경로와 비슷하게 생긴 다른 경로는 막는다', () => {
    expect(
      isDemoBlockedRequest({ method: 'POST', pathname: '/api/rum/extra' })
    ).toBe(true);
    expect(
      isDemoBlockedRequest({ method: 'POST', pathname: '/api/books/import' })
    ).toBe(true);
  });

  it('페이지 POST(서버 액션)는 여기서 가르지 않는다', () => {
    expect(
      isDemoBlockedRequest({ method: 'POST', pathname: '/settings/profile' })
    ).toBe(false);
  });
});

describe('isDemoLoginEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('DEMO_ACCOUNT_EMAIL 이 있을 때만 켜진다', () => {
    vi.stubEnv('DEMO_ACCOUNT_EMAIL', '');
    expect(isDemoLoginEnabled()).toBe(false);
    vi.stubEnv('DEMO_ACCOUNT_EMAIL', 'demo@page0127.test');
    expect(isDemoLoginEnabled()).toBe(true);
  });
});
