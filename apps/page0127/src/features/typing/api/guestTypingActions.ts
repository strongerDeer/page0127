'use server';

import { headers } from 'next/headers';

import { createHash } from 'node:crypto';

import { createAdminClient } from '@/shared/config/supabase/admin';
import {
  DEMO_READ_ONLY_MESSAGE,
  isDemoUser,
} from '@/shared/lib/demo/demoAccount';

import {
  FAMOUS_SHEETS,
  FULL_SHEETS,
  LITTLE_PRINCE_WORK,
} from '@/entities/typing';

import { deviceFromHeaders } from '../lib/device';
import { checkTypingRecord } from '../lib/recordCheck';
import { validateGuestNickname } from '../model/guestNickname';
import {
  currentTyper,
  issueFinishToken,
  issueStartToken,
  readWindowMs,
  secretFor,
} from './typingTicket';

import type { TypingActionResult } from './typingActions';

/**
 * 필사 시간 재기(회원·비회원) + 비회원 타수 랭킹 (Server Actions)
 *
 * 흐름:
 *   1) 첫 글자를 치는 순간 startTypingAction → 서버가 "이 쪽을 지금 시작" 토큰을 서명해 준다.
 *      비회원 쿠키(무작위 id)가 없으면 이때 만든다. 회원은 계정 id 로 묶는다.
 *   2) 마지막 글자를 치는 순간 finishTypingAction → 그 토큰에 "지금 끝" 시각을 더해 다시 서명한다.
 *   3) 회원은 recordTypingPageAction(typingActions.ts), 비회원은 결과 창에서 submitGuestTypingAction 으로 남긴다.
 *      둘 다 서버가 친 글로 정확도를 다시 계산하고, 서버 시계로 잰 시간으로 타수 상한을 정한다(lib/recordCheck).
 *
 * 비회원은 계정이 없으니 DB 함수를 service_role 로만 부른다(anon 에 열면 이 검사를 건너뛸 수 있다).
 * 완벽한 방지는 아니다 — 실제 키를 눌러 주는 매크로나, 정해진 시간을 기다렸다 제출하는 스크립트까지는 못 막는다.
 * 대신 "실제로 그만큼 시간을 들여 원문과 같게 쳐야" 하고, 도배는 IP 제한에 걸린다.
 */

const SHEETS = new Map(
  [...FULL_SHEETS, ...FAMOUS_SHEETS].map((sheet) => [sheet.key, sheet])
);

/** 같은 IP 에서 분당 제출 횟수 */
const SUBMIT_PER_MINUTE = 5;
const FAIL = '랭킹에 올리지 못했어요. 잠시 후 다시 시도해 주세요.';

const clientIp = async () =>
  (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

export type TypingTokenResult =
  { ok: true; token: string } | { ok: false; message: string };

export const startTypingAction = async (
  pageKey: string
): Promise<TypingTokenResult> => {
  const sheet = SHEETS.get(String(pageKey));
  if (!sheet) return { ok: false, message: FAIL };
  const typer = await currentTyper(true);
  if (!typer) return { ok: false, message: FAIL };
  return { ok: true, token: issueStartToken(sheet.key, typer.owner) };
};

/** 마지막 글자를 친 순간 — 시작 토큰에 끝 시각을 더해 다시 서명한다(결과 창에서 머문 시간은 세지 않게) */
export const finishTypingAction = async (
  token: string
): Promise<TypingTokenResult> => {
  const typer = await currentTyper(false);
  const next = typer ? issueFinishToken(String(token), typer.owner) : null;
  return next
    ? { ok: true, token: next }
    : { ok: false, message: '처음부터 다시 쳐 주세요.' };
};

export const submitGuestTypingAction = async (input: {
  token: string;
  pageKey: string;
  nickname: string;
  /** 친 글 전체 — 서버가 원문과 맞춰 정확도를 다시 센다 */
  typed: string;
  cpm: number;
  /** 자동 입력 흔적이 있었는가 */
  assisted: boolean;
}): Promise<TypingActionResult> => {
  // 로그인한 계정은 비회원 길로 올리지 않는다 — 회원 기록(typing_records)이 따로 있다.
  // 체험 계정(읽기 전용)도 여기서 막는다(app/demo-server-actions.test.ts 안전망).
  const typer = await currentTyper(false);
  if (typer?.user)
    return isDemoUser(typer.user)
      ? { ok: false, message: DEMO_READ_ONLY_MESSAGE }
      : { ok: false, message: '로그인한 계정은 기록이 자동으로 남아요.' };

  const sheet = SHEETS.get(String(input.pageKey));
  const windowMs =
    typer && sheet ? readWindowMs(input.token, typer.owner, sheet.key) : null;
  if (!typer || !sheet || windowMs === null)
    return { ok: false, message: '처음부터 다시 쳐 주세요.' };
  const guestId = typer.owner;

  const check = checkTypingRecord({
    text: sheet.text,
    typed: input.typed,
    clientCpm: input.cpm,
    serverWindowMs: windowMs,
    assisted: input.assisted === true,
  });
  if (!check.ok || !check.rankable) {
    // 정상 사용자가 걸리면 원인을 찾을 수 있게 남긴다
    console.warn('비회원 필사 기록 거절:', {
      page: sheet.key,
      windowMs,
      assisted: input.assisted === true,
      ok: check.ok,
    });
    return {
      ok: false,
      message: '기록을 확인하지 못했어요. 이 쪽을 처음부터 다시 쳐 주세요.',
    };
  }
  if (check.accuracy < 95)
    return {
      ok: false,
      message: '정확도 95% 이상일 때 타수 랭킹에 올라가요.',
    };
  if (check.clipped)
    console.warn('비회원 필사 타수 상한으로 깎음:', {
      page: sheet.key,
      windowMs,
      cpm: check.cpm,
    });
  const { accuracy, cpm } = check;
  const elapsedMs = windowMs;

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
