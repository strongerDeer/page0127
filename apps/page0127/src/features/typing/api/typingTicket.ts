import { cookies } from 'next/headers';

import { createHmac, randomUUID } from 'node:crypto';

import { createClient } from '@/shared/config/supabase/server';

import { GUEST_COOKIE, isGuestId } from '../lib/guestCookie';
import { createGuestToken, verifyGuestToken } from '../lib/guestToken';

import type { User } from '@supabase/supabase-js';

import 'server-only';

/**
 * 필사 "시작·끝 토큰" — 회원·비회원 모두 서버 시계로 필사 시간을 잰다(HJ 2026-11-26 B안)
 *
 * 예전엔 비회원만 토큰을 썼고 회원은 브라우저가 보낸 타수를 그대로 받았다 → 개발자 도구로 1500타를 넣을 수 있었다.
 * 이제 둘 다 첫 글자에 시작 토큰, 마지막 글자에 끝 토큰을 받고, 기록을 남길 때 그 사이 시간으로 타수 상한을 정한다.
 *
 * 토큰의 g(주인): 회원은 'u:<user id>', 비회원은 쿠키의 무작위 id.
 * 'use server' 파일에 두면 내보낸 함수가 그대로 서버 액션이 되므로, 도우미는 이 server-only 모듈에 둔다.
 */

/** 토큰 유효 시간 — 한 쪽을 1시간 넘게 쓰면 다시 시작 */
export const TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * 서명 비밀값 — 새 환경변수를 두지 않으려고 service_role 키에서 용도별로 한 번 더 파생한다.
 * (원래 키를 그대로 서명에 쓰지 않는다: 용도가 다른 값끼리 섞이지 않게)
 */
export const secretFor = (purpose: string) => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  return createHmac('sha256', key).update(purpose).digest('hex');
};

const tokenSecret = () => secretFor('typing-guest-token-v1');

const memberOwner = (userId: string) => `u:${userId}`;

/** 지금 치는 사람 — 회원이면 'u:<id>', 비회원이면 쿠키 id(create 면 없을 때 만든다) */
export const currentTyper = async (
  create: boolean
): Promise<{ owner: string; user: User | null } | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return { owner: memberOwner(user.id), user };

  const jar = await cookies();
  let guestId = jar.get(GUEST_COOKIE)?.value;
  if (!isGuestId(guestId)) {
    if (!create) return null;
    guestId = randomUUID();
    jar.set(GUEST_COOKIE, guestId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return { owner: guestId, user: null };
};

export const issueStartToken = (pageKey: string, owner: string) =>
  createGuestToken({ k: pageKey, g: owner, t: Date.now() }, tokenSecret());

/** 시작 토큰에 "지금 끝" 시각을 더해 다시 서명한다. 주인·쪽이 맞지 않거나 너무 오래되면 null */
export const issueFinishToken = (token: string, owner: string) => {
  const secret = tokenSecret();
  const p = verifyGuestToken(String(token), secret);
  const now = Date.now();
  if (!p || p.e !== undefined || p.g !== owner || now - p.t > TOKEN_TTL_MS)
    return null;
  return createGuestToken({ ...p, e: now }, secret);
};

/**
 * 끝 토큰을 풀어 서버가 잰 "첫 글자 ~ 마지막 글자"(ms)를 돌려준다.
 * 주인·쪽이 다르거나, 끝 시각이 없거나, 너무 오래됐으면 null.
 */
export const readWindowMs = (
  token: unknown,
  owner: string,
  pageKey: string
): number | null => {
  if (typeof token !== 'string') return null;
  const p = verifyGuestToken(token, tokenSecret());
  if (!p || p.e === undefined || p.g !== owner || p.k !== pageKey) return null;
  const windowMs = p.e - p.t;
  if (windowMs < 0 || Date.now() - p.e > TOKEN_TTL_MS) return null;
  return windowMs;
};
