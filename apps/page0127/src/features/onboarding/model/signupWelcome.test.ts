import { describe, expect, it } from 'vitest';

import { readSignupMethod, toWelcomePath } from './signupWelcome';

describe('toWelcomePath', () => {
  it('서재 주소에 로그인 공급자를 붙인다', () => {
    expect(toWelcomePath('bookworm', 'kakao')).toBe('/bookworm?welcome=kakao');
  });

  it('공급자를 모르거나 이상한 값이면 other 로 붙인다', () => {
    expect(toWelcomePath('bookworm', undefined)).toBe(
      '/bookworm?welcome=other'
    );
    expect(toWelcomePath('bookworm', 'Evil&x=1')).toBe(
      '/bookworm?welcome=other'
    );
  });
});

describe('readSignupMethod', () => {
  it('표시가 없으면 null — 이벤트를 보내지 않는다', () => {
    expect(readSignupMethod(null)).toBeNull();
  });

  it('공급자를 그대로 돌려준다', () => {
    expect(readSignupMethod('google')).toBe('google');
  });

  it('손으로 고친 값은 other 로 뭉갠다', () => {
    expect(readSignupMethod('<script>')).toBe('other');
    expect(readSignupMethod('')).toBe('other');
  });
});
