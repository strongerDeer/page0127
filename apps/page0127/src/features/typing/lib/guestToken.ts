import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * 비회원 필사 "시작 토큰" — 서버 시계로 걸린 시간을 재기 위한 서명된 쪽지
 *
 * 왜 필요한가:
 *   회원 기록은 걸린 시간(durationMs)을 클라이언트가 보내도 계정이 걸려 있어 부담이 있지만,
 *   비회원은 그 값을 조작해 1,400타를 넣어도 막을 근거가 없다.
 *   그래서 치기 시작할 때 서버가 "이 쪽을 이 시각에 시작했다"를 HMAC 으로 서명해 주고,
 *   제출할 때 서버가 지금 시각과 비교한다. 서명이 있으니 클라이언트가 시작 시각을 앞당길 수 없다.
 *
 * 형식: base64url(JSON{k: 쪽 열쇠, g: 비회원 id, t: 시작 ms}) + '.' + base64url(HMAC-SHA256)
 * 순수 함수로 두고 비밀값은 인자로 받는다 → 테스트에서 시계·비밀값을 마음대로 넣는다.
 */
export type GuestTokenPayload = { k: string; g: string; t: number };

const b64url = (buf: Buffer) => buf.toString('base64url');

const sign = (body: string, secret: string) =>
  createHmac('sha256', secret).update(body).digest();

export const createGuestToken = (
  payload: GuestTokenPayload,
  secret: string
): string => {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return `${body}.${b64url(sign(body, secret))}`;
};

export const verifyGuestToken = (
  token: string,
  secret: string
): GuestTokenPayload | null => {
  if (typeof token !== 'string' || token.length > 1000) return null;
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) return null;
  const expected = sign(body, secret);
  const given = Buffer.from(sig, 'base64url');
  // 길이가 다르면 timingSafeEqual 이 throw 하므로 먼저 본다
  if (given.length !== expected.length || !timingSafeEqual(given, expected))
    return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (
      typeof p?.k !== 'string' ||
      typeof p?.g !== 'string' ||
      typeof p?.t !== 'number'
    )
      return null;
    return { k: p.k, g: p.g, t: p.t };
  } catch {
    return null;
  }
};

/**
 * 서버가 잰 경과 시간으로 낼 수 있는 최대 타수.
 * 쪽 전체 타수를 경과 시간에 다 쳤다고 봐도 이보다 빠를 수는 없다.
 * 시작 요청이 첫 글자보다 조금 늦게 서버에 닿는 만큼(네트워크 지연)은 여유(slackMs)로 봐준다.
 */
export const maxCpmFor = (
  totalStrokes: number,
  serverElapsedMs: number,
  slackMs = 2000
): number => Math.floor(totalStrokes / ((serverElapsedMs + slackMs) / 60_000));
