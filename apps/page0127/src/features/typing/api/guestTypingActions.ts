'use server';

import { cookies, headers } from 'next/headers';

import { createHash, createHmac, randomUUID } from 'node:crypto';

import { createAdminClient } from '@/shared/config/supabase/admin';
import { createClient } from '@/shared/config/supabase/server';
import {
  DEMO_READ_ONLY_MESSAGE,
  isDemoUser,
} from '@/shared/lib/demo/demoAccount';

import {
  FAMOUS_SHEETS,
  FULL_SHEETS,
  LITTLE_PRINCE_WORK,
  strokesOf,
} from '@/entities/typing';

import { deviceFromHeaders } from '../lib/device';
import { GUEST_COOKIE, isGuestId } from '../lib/guestCookie';
import {
  createGuestToken,
  maxCpmFor,
  verifyGuestToken,
} from '../lib/guestToken';
import { validateGuestNickname } from '../model/guestNickname';

import type { TypingActionResult } from './typingActions';

/**
 * 비회원 필사 → 타수 랭킹 (Server Actions, HJ 2026-11-26 A안)
 *
 * 흐름:
 *   1) 첫 글자를 치는 순간 startGuestTypingAction → 서버가 "이 쪽을 지금 시작" 토큰을 서명해 준다.
 *      비회원 쿠키(무작위 id)가 없으면 이때 만든다.
 *   2) 마지막 글자를 치는 순간 finishGuestTypingAction → 그 토큰에 "지금 끝" 시각을 더해 다시 서명한다.
 *   3) 결과 창에서 닉네임을 적고 올리면 submitGuestTypingAction →
 *      토큰 서명·쿠키 일치 → 서버 시계로 잰 "첫 글자 ~ 마지막 글자" 시간의 최대 타수 이하인지 → 닉네임 → IP 분당 횟수 →
 *      DB 함수(정확도 95%↑, 40ms/글자, 같은 IP 하루 새 비회원 3명)까지 통과해야 남는다.
 *
 * 비회원은 계정이 없으니 DB 함수를 service_role 로만 부른다(anon 에 열면 이 검사를 건너뛸 수 있다).
 * 완벽한 방지는 아니다 — 스크립트가 정해진 시간을 기다렸다 제출하는 것까지는 못 막는다.
 * 대신 "실제로 그만큼 시간을 들여야" 하고, 도배는 IP 제한에 걸린다.
 */

const SHEETS = new Map(
  [...FULL_SHEETS, ...FAMOUS_SHEETS].map((sheet) => [sheet.key, sheet])
);

/** 토큰 유효 시간 — 한 쪽을 1시간 넘게 쓰면 다시 시작 */
const TOKEN_TTL_MS = 60 * 60 * 1000;
/** 같은 IP 에서 분당 제출 횟수 */
const SUBMIT_PER_MINUTE = 5;
const FAIL = '랭킹에 올리지 못했어요. 잠시 후 다시 시도해 주세요.';

/**
 * 서명 비밀값 — 새 환경변수를 두지 않으려고 service_role 키에서 용도별로 한 번 더 파생한다.
 * (원래 키를 그대로 서명에 쓰지 않는다: 용도가 다른 값끼리 섞이지 않게)
 */
const secretFor = (purpose: string) => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
  return createHmac('sha256', key).update(purpose).digest('hex');
};

const clientIp = async () =>
  (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

export type GuestStartResult =
  { ok: true; token: string } | { ok: false; message: string };

export const startGuestTypingAction = async (
  pageKey: string
): Promise<GuestStartResult> => {
  const sheet = SHEETS.get(String(pageKey));
  if (!sheet) return { ok: false, message: FAIL };

  const jar = await cookies();
  let guestId = jar.get(GUEST_COOKIE)?.value;
  if (!isGuestId(guestId)) {
    guestId = randomUUID();
    jar.set(GUEST_COOKIE, guestId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const token = createGuestToken(
    { k: sheet.key, g: guestId, t: Date.now() },
    secretFor('typing-guest-token-v1')
  );
  return { ok: true, token };
};

/** 마지막 글자를 친 순간 — 시작 토큰에 끝 시각을 더해 다시 서명한다(결과 창에서 머문 시간은 세지 않게) */
export const finishGuestTypingAction = async (
  token: string
): Promise<GuestStartResult> => {
  const secret = secretFor('typing-guest-token-v1');
  const payload = verifyGuestToken(String(token), secret);
  const guestId = (await cookies()).get(GUEST_COOKIE)?.value;
  if (
    !payload ||
    payload.e !== undefined ||
    !SHEETS.has(payload.k) ||
    !isGuestId(guestId) ||
    payload.g !== guestId
  )
    return { ok: false, message: '처음부터 다시 쳐 주세요.' };
  const now = Date.now();
  if (now - payload.t > TOKEN_TTL_MS)
    return { ok: false, message: '시간이 너무 지났어요. 다시 쳐 주세요.' };
  return { ok: true, token: createGuestToken({ ...payload, e: now }, secret) };
};

export const submitGuestTypingAction = async (input: {
  token: string;
  nickname: string;
  cpm: number;
  accuracy: number;
}): Promise<TypingActionResult> => {
  // 로그인한 계정은 비회원 길로 올리지 않는다 — 회원 기록(typing_records)이 따로 있다.
  // 체험 계정(읽기 전용)도 여기서 막는다(app/demo-server-actions.test.ts 안전망).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user)
    return isDemoUser(user)
      ? { ok: false, message: DEMO_READ_ONLY_MESSAGE }
      : { ok: false, message: '로그인한 계정은 기록이 자동으로 남아요.' };

  const payload = verifyGuestToken(
    String(input.token),
    secretFor('typing-guest-token-v1')
  );
  const sheet = payload ? SHEETS.get(payload.k) : undefined;
  const jar = await cookies();
  const guestId = jar.get(GUEST_COOKIE)?.value;
  if (
    !payload ||
    payload.e === undefined ||
    !sheet ||
    !isGuestId(guestId) ||
    payload.g !== guestId
  )
    return { ok: false, message: '처음부터 다시 쳐 주세요.' };

  // 첫 글자 ~ 마지막 글자(서버 시계). 결과 창에서 닉네임을 고민한 시간은 들어가지 않는다
  const elapsedMs = payload.e - payload.t;
  if (elapsedMs < 0 || Date.now() - payload.e > TOKEN_TTL_MS)
    return { ok: false, message: '시간이 너무 지났어요. 다시 쳐 주세요.' };

  const accuracy = Math.round(Number(input.accuracy));
  if (!(accuracy >= 95 && accuracy <= 100))
    return {
      ok: false,
      message: '정확도 95% 이상일 때 타수 랭킹에 올라가요.',
    };

  // 서버 시계로 잰 시간 안에 이 쪽을 다 쳤을 때의 최대 타수 — 이보다 빠르다는 기록은 받지 않는다
  const totalStrokes = [...sheet.text].reduce((n, c) => n + strokesOf(c), 0);
  const cap = Math.min(1500, maxCpmFor(totalStrokes, elapsedMs));
  const cpm = Math.round(Number(input.cpm));
  if (!(cpm >= 1 && cpm <= cap)) {
    // 정상 사용자가 걸리면 원인을 찾을 수 있게 남긴다(경과 시간·상한·보낸 값)
    console.warn('비회원 필사 타수 상한 초과:', {
      page: sheet.key,
      elapsedMs,
      cap,
      cpm,
    });
    return {
      ok: false,
      message: '기록을 확인하지 못했어요. 이 쪽을 처음부터 다시 쳐 주세요.',
    };
  }

  const name = validateGuestNickname(input.nickname);
  if (!name.ok) return name;

  const ip = await clientIp();
  const h = await headers();
  const device = deviceFromHeaders((name) => h.get(name));
  const admin = createAdminClient();

  // IP 분당 횟수 — 기존 레이트 리밋 표를 같이 쓴다(등급 이름을 앞에 붙여 다른 API 와 카운터를 나눈다)
  const { data: count, error: limitError } = await admin.rpc(
    'increment_rate_limit',
    { p_identifier: `typing-guest:ip:${ip}` }
  );
  if (limitError)
    console.warn('비회원 필사 레이트 리밋 확인 실패:', limitError.message);
  else if ((count as number) > SUBMIT_PER_MINUTE)
    return { ok: false, message: '잠시 후 다시 시도해 주세요.' };

  const ipHash = createHash('sha256')
    .update(`${secretFor('typing-guest-ip-v1')}:${ip}`)
    .digest('hex');

  const { error } = await admin.rpc('record_typing_guest_page', {
    p_guest_id: guestId,
    p_ip_hash: ipHash,
    p_nickname: name.nickname,
    p_work: LITTLE_PRINCE_WORK,
    p_page_key: sheet.key,
    p_chars: sheet.text.length,
    p_cpm: cpm,
    p_accuracy: accuracy,
    p_duration_ms: Math.max(1000, Math.min(elapsedMs, 3_600_000)),
    p_device: device,
  });
  if (error) {
    if (error.message.includes('too many guests'))
      return {
        ok: false,
        message: '오늘은 이 곳에서 새 닉네임을 더 올릴 수 없어요.',
      };
    console.warn('비회원 필사 기록 실패:', error.message);
    return { ok: false, message: FAIL };
  }
  return { ok: true };
};
