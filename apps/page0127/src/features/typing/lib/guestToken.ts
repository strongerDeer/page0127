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
export type GuestTokenPayload = {
  k: string;
  g: string;
  /** 첫 글자를 친 순간 서버가 받은 시각(ms) */
  t: number;
  /** 마지막 글자를 친 순간 서버가 받은 시각(ms) — 끝 토큰에만 있다 */
  e?: number;
};

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
      typeof p?.t !== 'number' ||
      (p.e !== undefined && typeof p.e !== 'number')
    )
      return null;
    return p.e === undefined
      ? { k: p.k, g: p.g, t: p.t }
      : { k: p.k, g: p.g, t: p.t, e: p.e };
  } catch {
    return null;
  }
};

/**
 * 서버가 잰 "첫 글자 ~ 마지막 글자" 시간으로 낼 수 있는 최대 타수.
 * 그 시간 동안 쪽 전체를 쳤다면 이보다 빠를 수 없다.
 * 끝 요청이 마지막 글자보다 늦게 서버에 닿는 만큼(네트워크 지연·콜드 스타트)은 시간을 빼서(slackMs) 봐준다.
 *
 * 예전에는 "시작 ~ 이름 올리기를 누른 순간"으로 쟀다 → 결과 창에서 닉네임을 고민한 시간까지 필사 시간이 되어
 * 정상 기록(418타)이 "그 시간에 나올 수 없는 타수"로 거절됐다(HJ 2026-11-26).
 */
export const maxCpmFor = (
  totalStrokes: number,
  serverWindowMs: number,
  slackMs = 3000
): number =>
  Math.floor(
    totalStrokes / (Math.max(serverWindowMs - slackMs, 1000) / 60_000)
  );
