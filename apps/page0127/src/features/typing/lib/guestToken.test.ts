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

describe('끝 토큰', () => {
  it('끝 시각(e)도 서명 안에 들어간다', () => {
    const done = { ...payload, e: payload.t + 30_000 };
    const token = createGuestToken(done, SECRET);
    expect(verifyGuestToken(token, SECRET)).toEqual(done);
    const [, sig] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ ...done, e: payload.t + 300_000 })
    ).toString('base64url');
    expect(verifyGuestToken(`${forged}.${sig}`, SECRET)).toBeNull();
  });
});

describe('서버 시계 기준 최대 타수(첫 글자 ~ 마지막 글자)', () => {
  it('300타짜리 쪽을 63초(여유 3초 빼면 60초)에 쳤다면 300타가 최대', () => {
    expect(maxCpmFor(300, 63_000)).toBe(300);
  });

  it('실제로 친 시간만 재므로, 같은 기록이면 상한이 실제 타수 이상이다', () => {
    // 418타로 26초 동안 친 쪽(약 181타) — 끝 요청이 2초 늦게 닿아도 통과
    const strokes = Math.round((418 * 26) / 60);
    expect(maxCpmFor(strokes, 28_000)).toBeGreaterThanOrEqual(418);
  });

  it('시간을 짧게 쓸수록 상한이 높아진다 — 그래도 실제로 그 시간이 지나야 한다', () => {
    expect(maxCpmFor(300, 33_000)).toBe(600);
    expect(maxCpmFor(300, 1_000)).toBe(18_000);
  });
});
