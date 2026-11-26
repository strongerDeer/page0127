import { describe, expect, it } from 'vitest';

import { createGuestToken, maxCpmFor, verifyGuestToken } from './guestToken';

const SECRET = 'test-secret';
const payload = {
  k: 'f:fox-secret',
  g: '11111111-1111-4111-8111-111111111111',
  t: 1_700_000_000_000,
};

describe('비회원 시작 토큰', () => {
  it('서명한 토큰은 같은 비밀값으로 풀린다', () => {
    const token = createGuestToken(payload, SECRET);
    expect(verifyGuestToken(token, SECRET)).toEqual(payload);
  });

  it('비밀값이 다르면 거절한다', () => {
    const token = createGuestToken(payload, SECRET);
    expect(verifyGuestToken(token, 'other')).toBeNull();
  });

  it('시작 시각을 앞당기도록 몸통을 바꾸면 거절한다', () => {
    const token = createGuestToken(payload, SECRET);
    const [, sig] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ ...payload, t: payload.t - 600_000 })
    ).toString('base64url');
    expect(verifyGuestToken(`${forged}.${sig}`, SECRET)).toBeNull();
  });

  it('모양이 이상한 값은 거절한다', () => {
    expect(verifyGuestToken('', SECRET)).toBeNull();
    expect(verifyGuestToken('abc', SECRET)).toBeNull();
    expect(verifyGuestToken('a.b.c', SECRET)).toBeNull();
    expect(verifyGuestToken('a'.repeat(2000), SECRET)).toBeNull();
  });
});

describe('서버 시계 기준 최대 타수', () => {
  it('300타짜리 쪽을 60초(+여유 2초)에 쳤다면 약 290타가 최대', () => {
    expect(maxCpmFor(300, 60_000)).toBe(290);
  });

  it('시간을 짧게 쓸수록 상한이 높아진다 — 그래도 실제로 그 시간이 지나야 한다', () => {
    expect(maxCpmFor(300, 10_000)).toBe(1500);
    expect(maxCpmFor(300, 28_000)).toBe(600);
  });
});
