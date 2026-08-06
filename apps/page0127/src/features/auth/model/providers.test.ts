import { describe, expect, it } from 'vitest';

import { isOAuthProvider, LOGIN_PROVIDER_ORDER } from './providers';

describe('isOAuthProvider', () => {
  it('아는 공급자면 통과시킨다', () => {
    expect(isOAuthProvider('kakao')).toBe(true);
    expect(isOAuthProvider('google')).toBe(true);
  });

  it('모르는 문자열은 막는다', () => {
    // ?linked=nonsense 로 들어오면 OAUTH_PROVIDERS[…] 가 undefined 가 되어
    // .label 을 읽는 순간 화면이 죽는다
    expect(isOAuthProvider('nonsense')).toBe(false);
    expect(isOAuthProvider('')).toBe(false);
  });

  it('문자열이 아닌 값도 막는다', () => {
    expect(isOAuthProvider(null)).toBe(false);
    expect(isOAuthProvider(undefined)).toBe(false);
    expect(isOAuthProvider(123)).toBe(false);
  });

  it('Object.prototype 의 키에 속지 않는다', () => {
    // `in` 은 프로토타입 체인까지 본다 — 'toString' 이 통과하면
    // OAUTH_PROVIDERS['toString'] 은 함수라 .label 이 undefined 가 된다
    expect(isOAuthProvider('toString')).toBe(false);
    expect(isOAuthProvider('constructor')).toBe(false);
  });
});

describe('LOGIN_PROVIDER_ORDER', () => {
  it('한국 사용자에게 익숙한 카카오가 먼저다', () => {
    expect(LOGIN_PROVIDER_ORDER[0]).toBe('kakao');
  });

  it('아는 공급자만 들어 있다', () => {
    for (const provider of LOGIN_PROVIDER_ORDER) {
      expect(isOAuthProvider(provider)).toBe(true);
    }
  });
});
