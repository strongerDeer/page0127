import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
} from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { getVerifiedUser } from './getVerifiedUser';

import type { User } from '@supabase/supabase-js';

describe('서버의 로그인 상태 검증', () => {
  it('검증된 사용자만 반환한다', async () => {
    const user = { id: 'reader' } as User;
    const getUser = vi.fn().mockResolvedValue({ data: { user }, error: null });
    expect(await getVerifiedUser({ getUser })).toBe(user);
  });

  it.each([
    new AuthSessionMissingError(),
    new AuthApiError('revoked', 401, 'bad_jwt'),
    new AuthApiError('expired refresh', 400, 'refresh_token_not_found'),
    new AuthApiError('banned', 403, 'user_banned'),
  ])(
    '세션 없음·명시적인 인증 거절만 비로그인으로 처리한다: %s',
    async (error) => {
      const getUser = vi
        .fn()
        .mockResolvedValue({ data: { user: null }, error });
      expect(await getVerifiedUser({ getUser })).toBeNull();
    }
  );

  it.each([
    new AuthRetryableFetchError('offline', 0),
    new AuthApiError('server down', 503, undefined),
    new AuthApiError('rate limit', 429, undefined),
    new AuthApiError('timeout', 408, undefined),
  ])('일시적 실패는 비로그인으로 바꾸지 않는다: %s', async (error) => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: null }, error });
    await expect(getVerifiedUser({ getUser })).rejects.toBe(error);
  });

  it('검증 자체가 예외를 던져도 쿠키에 있는 사용자로 대체하지 않는다', async () => {
    const error = new TypeError('network unavailable');
    await expect(
      getVerifiedUser({ getUser: vi.fn().mockRejectedValue(error) })
    ).rejects.toBe(error);
  });
});
