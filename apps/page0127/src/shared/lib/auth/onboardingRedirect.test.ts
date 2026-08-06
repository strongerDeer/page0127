import { describe, expect, it } from 'vitest';

import { ONBOARDING_PATH, toPostLoginPath } from './onboardingRedirect';

describe('toPostLoginPath', () => {
  it('온보딩을 마쳤으면 원래 가려던 곳으로 보낸다', () => {
    expect(
      toPostLoginPath({
        username: 'bookworm',
        onboardedAt: '2026-08-06T00:00:00Z',
        next: '/feed',
      })
    ).toBe('/feed');
  });

  it('갈 곳이 없으면 본인 서재로 보낸다', () => {
    expect(
      toPostLoginPath({
        username: 'bookworm',
        onboardedAt: '2026-08-06T00:00:00Z',
        next: null,
      })
    ).toBe('/bookworm');
  });

  it('온보딩 미완료면 온보딩으로 보낸다', () => {
    expect(
      toPostLoginPath({ username: 'reader_a1b2c3', onboardedAt: null, next: null })
    ).toBe(ONBOARDING_PATH);
  });

  it('온보딩 미완료면 next 가 있어도 온보딩이 먼저다', () => {
    // 아이디가 정해지기 전에 서재로 보내면 자동 생성된 주소가 굳어 버린다
    expect(
      toPostLoginPath({
        username: 'reader_a1b2c3',
        onboardedAt: null,
        next: '/feed',
      })
    ).toBe(ONBOARDING_PATH);
  });

  it('외부 주소는 버리고 본인 서재로 보낸다', () => {
    // next 는 사용자가 만들어 열 수 있는 값이다 (오픈 리다이렉트)
    expect(
      toPostLoginPath({
        username: 'bookworm',
        onboardedAt: '2026-08-06T00:00:00Z',
        next: 'https://evil.com',
      })
    ).toBe('/bookworm');
    expect(
      toPostLoginPath({
        username: 'bookworm',
        onboardedAt: '2026-08-06T00:00:00Z',
        next: '//evil.com',
      })
    ).toBe('/bookworm');
  });

  it('아이디가 없으면 온보딩으로 보낸다', () => {
    // 아이디 없이 서재로 보내면 `/` 로 튕긴다
    expect(
      toPostLoginPath({
        username: null,
        onboardedAt: '2026-08-06T00:00:00Z',
        next: null,
      })
    ).toBe(ONBOARDING_PATH);
  });
});
