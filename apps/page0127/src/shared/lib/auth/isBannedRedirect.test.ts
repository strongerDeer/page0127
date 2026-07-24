import { describe, expect, it } from 'vitest';

import { isBannedRedirect } from './isBannedRedirect';

describe('isBannedRedirect', () => {
  it('error_code=user_banned면 true (정지 리다이렉트)', () => {
    const p = new URLSearchParams(
      'error=access_denied&error_code=user_banned&error_description=User+is+banned'
    );
    expect(isBannedRedirect(p)).toBe(true);
  });
  it('code만 있으면(정상 로그인) false', () => {
    expect(isBannedRedirect(new URLSearchParams('code=abc123'))).toBe(false);
  });
  it('밴과 무관한 error_code면 false', () => {
    expect(
      isBannedRedirect(
        new URLSearchParams('error=server_error&error_code=unexpected_failure')
      )
    ).toBe(false);
  });
  it('빈 파라미터면 false', () => {
    expect(isBannedRedirect(new URLSearchParams(''))).toBe(false);
  });
});
