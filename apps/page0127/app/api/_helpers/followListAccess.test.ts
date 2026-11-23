import { describe, expect, it } from 'vitest';

import { checkFollowListAccess } from './followListAccess';

describe('checkFollowListAccess', () => {
  it('본인 목록은 볼 수 있다', () => {
    expect(checkFollowListAccess('me', 'me')).toBe('ok');
  });

  it('남의 목록은 로그인해도 막는다', () => {
    expect(checkFollowListAccess('me', 'other')).toBe('forbidden');
  });

  it('로그인하지 않았으면 막는다', () => {
    expect(checkFollowListAccess(null, 'other')).toBe('unauthorized');
    expect(checkFollowListAccess(undefined, 'other')).toBe('unauthorized');
  });
});
