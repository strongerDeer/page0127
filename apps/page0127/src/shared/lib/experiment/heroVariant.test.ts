import { describe, expect, it } from 'vitest';

import {
  hasAuthCookie,
  isHeroAbOn,
  parseHeroVariant,
  pickHeroVariant,
  readHeroVariantFromCookieString,
  resolveHeroVariant,
  shouldAssignHeroVariant,
} from './heroVariant';

describe('isHeroAbOn', () => {
  it('on 일 때만 켜진다', () => {
    expect(isHeroAbOn('on')).toBe(true);
    expect(isHeroAbOn(undefined)).toBe(false);
    expect(isHeroAbOn('true')).toBe(false);
    expect(isHeroAbOn('ON')).toBe(false);
  });
});

describe('parseHeroVariant', () => {
  it('a·b 만 받고 나머지는 없음으로 본다', () => {
    expect(parseHeroVariant('a')).toBe('a');
    expect(parseHeroVariant('b')).toBe('b');
    expect(parseHeroVariant('c')).toBeNull();
    expect(parseHeroVariant('')).toBeNull();
    expect(parseHeroVariant(undefined)).toBeNull();
  });
});

describe('pickHeroVariant', () => {
  it('난수가 0.5 미만이면 a, 이상이면 b', () => {
    expect(pickHeroVariant(() => 0)).toBe('a');
    expect(pickHeroVariant(() => 0.49)).toBe('a');
    expect(pickHeroVariant(() => 0.5)).toBe('b');
    expect(pickHeroVariant(() => 0.99)).toBe('b');
  });
});

describe('resolveHeroVariant', () => {
  it('스위치가 켜져 있으면 쿠키를 따른다', () => {
    expect(resolveHeroVariant('b', true)).toBe('b');
    expect(resolveHeroVariant('a', true)).toBe('a');
  });

  it('스위치가 꺼져 있으면 쿠키가 b 여도 A', () => {
    expect(resolveHeroVariant('b', false)).toBe('a');
  });

  it('쿠키가 없거나 이상하면 A', () => {
    expect(resolveHeroVariant(undefined, true)).toBe('a');
    expect(resolveHeroVariant('x', true)).toBe('a');
  });
});

describe('hasAuthCookie', () => {
  it('Supabase 인증 쿠키(나뉜 것 포함)를 알아본다', () => {
    expect(hasAuthCookie(['sb-abcd-auth-token'])).toBe(true);
    expect(
      hasAuthCookie(['sb-abcd-auth-token.0', 'sb-abcd-auth-token.1'])
    ).toBe(true);
  });

  it('다른 쿠키는 로그인으로 보지 않는다', () => {
    expect(hasAuthCookie([])).toBe(false);
    expect(
      hasAuthCookie(['hero_variant', '_ga', 'sb-abcd-code-verifier'])
    ).toBe(false);
  });
});

describe('shouldAssignHeroVariant', () => {
  const base = {
    abOn: true,
    pathname: '/',
    cookieNames: ['_ga'],
    current: undefined,
  };

  it('홈에 처음 온 비로그인 방문자에게만 정한다', () => {
    expect(shouldAssignHeroVariant(base)).toBe(true);
  });

  it('스위치가 꺼져 있으면 정하지 않는다', () => {
    expect(shouldAssignHeroVariant({ ...base, abOn: false })).toBe(false);
  });

  it('홈이 아니면 정하지 않는다', () => {
    expect(shouldAssignHeroVariant({ ...base, pathname: '/about' })).toBe(
      false
    );
  });

  it('이미 그룹이 있으면 다시 정하지 않는다', () => {
    expect(shouldAssignHeroVariant({ ...base, current: 'b' })).toBe(false);
  });

  it('그룹 쿠키가 이상한 값이면 다시 정한다', () => {
    expect(shouldAssignHeroVariant({ ...base, current: 'zzz' })).toBe(true);
  });

  it('로그인한 적 있는 브라우저는 정하지 않는다', () => {
    expect(
      shouldAssignHeroVariant({
        ...base,
        cookieNames: ['sb-abcd-auth-token'],
      })
    ).toBe(false);
  });
});

describe('readHeroVariantFromCookieString', () => {
  it('여러 쿠키 사이에서 그룹을 찾는다', () => {
    expect(readHeroVariantFromCookieString('_ga=1; hero_variant=b; x=y')).toBe(
      'b'
    );
  });

  it('없거나 이상하면 null', () => {
    expect(readHeroVariantFromCookieString('')).toBeNull();
    expect(readHeroVariantFromCookieString('_ga=1')).toBeNull();
    expect(readHeroVariantFromCookieString('hero_variant=q')).toBeNull();
  });
});
