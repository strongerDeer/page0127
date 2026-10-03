import { describe, expect, it } from 'vitest';

import {
  isRefreshTokenExpired,
  needsAccessRefresh,
  type StoredKakaoTokens,
  toStoredTokens,
} from './tokens';

const NOW = new Date('2026-10-03T00:00:00Z');
const HOUR = 60 * 60;

const previous: StoredKakaoTokens = {
  accessToken: 'old-access',
  accessTokenExpiresAt: new Date('2026-10-02T12:00:00Z'),
  refreshToken: 'old-refresh',
  refreshTokenExpiresAt: new Date('2026-11-20T00:00:00Z'),
};

describe('toStoredTokens', () => {
  it('남은 초를 만료 시각으로 바꾼다', () => {
    const stored = toStoredTokens(
      {
        access_token: 'a',
        expires_in: 12 * HOUR,
        refresh_token: 'r',
        refresh_token_expires_in: 60 * 24 * HOUR,
      },
      NOW
    );
    expect(stored.accessTokenExpiresAt.toISOString()).toBe('2026-10-03T12:00:00.000Z');
    expect(stored.refreshTokenExpiresAt.toISOString()).toBe('2026-12-02T00:00:00.000Z');
  });

  it('갱신 응답에 refresh_token 이 없으면 기존 리프레시 토큰을 유지한다', () => {
    // 카카오는 남은 기간이 1달 이상이면 새 리프레시 토큰을 주지 않는다
    const stored = toStoredTokens({ access_token: 'new-access', expires_in: 12 * HOUR }, NOW, previous);
    expect(stored.accessToken).toBe('new-access');
    expect(stored.refreshToken).toBe('old-refresh');
    expect(stored.refreshTokenExpiresAt).toEqual(previous.refreshTokenExpiresAt);
  });

  it('갱신 응답에 새 refresh_token 이 오면 그것으로 바꾼다', () => {
    const stored = toStoredTokens(
      { access_token: 'a', expires_in: HOUR, refresh_token: 'new-refresh', refresh_token_expires_in: HOUR },
      NOW,
      previous
    );
    expect(stored.refreshToken).toBe('new-refresh');
  });

  it('최초 발급인데 refresh_token 이 없으면 실패한다', () => {
    expect(() => toStoredTokens({ access_token: 'a', expires_in: HOUR }, NOW)).toThrow('다시 연결');
  });
});

describe('needsAccessRefresh', () => {
  const withExpiry = (iso: string): StoredKakaoTokens => ({
    ...previous,
    accessTokenExpiresAt: new Date(iso),
  });

  it('충분히 남았으면 갱신하지 않는다', () => {
    expect(needsAccessRefresh(withExpiry('2026-10-03T01:00:00Z'), NOW)).toBe(false);
  });

  it('10분 안에 만료되면 미리 갱신한다', () => {
    expect(needsAccessRefresh(withExpiry('2026-10-03T00:09:00Z'), NOW)).toBe(true);
  });

  it('이미 만료됐으면 갱신한다', () => {
    expect(needsAccessRefresh(withExpiry('2026-10-02T23:00:00Z'), NOW)).toBe(true);
  });
});

describe('isRefreshTokenExpired', () => {
  it('리프레시 토큰 만료 시각이 지났는지 본다', () => {
    expect(isRefreshTokenExpired(previous, NOW)).toBe(false);
    expect(isRefreshTokenExpired(previous, new Date('2026-11-20T00:00:01Z'))).toBe(true);
  });
});
