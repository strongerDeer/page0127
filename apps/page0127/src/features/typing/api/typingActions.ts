'use server';

import { headers } from 'next/headers';

import { createClient } from '@/shared/config/supabase/server';
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
import { currentTyper, readWindowMs } from './typingTicket';

/**
 * 온라인 필사 기록 (Server Actions)
 *
 * - 사용자 ID 는 받지 않는다 — DB 함수가 auth.uid() 로 정한다.
 * - 쪽 열쇠는 실제 본문에 있는 것만 받는다. 글자 수도 클라이언트 값 대신 본문에서 센다
 *   → 짧은 글자 수를 보내 타수를 부풀리는 길을 막는다.
 * - 정확도는 친 글로 서버가 다시 세고, 타수는 서버 시계(시작·끝 토큰)로 잰 시간 안의 최대치로 자른다.
 *   (예전엔 브라우저 타수를 그대로 받아 개발자 도구로 1500타를 넣을 수 있었다 — HJ 2026-11-26 B안)
 * - 말이 안 되게 빠른 기록은 DB 함수 record_typing_page() 가 한 번 더 거른다(다층 방어).
 */
export type TypingActionResult = { ok: true } | { ok: false; message: string };

const SHEETS = new Map(
  [...FULL_SHEETS, ...FAMOUS_SHEETS].map((sheet) => [sheet.key, sheet])
);

const toInt = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : NaN;

export const recordTypingPageAction = async (input: {
  pageKey: string;
  /** 끝 토큰(startTypingAction → finishTypingAction). 없으면 진행도만 남고 타수는 0 */
  token: string | null;
  /** 친 글 전체 — 서버가 원문과 맞춰 정확도를 다시 센다 */
  typed: string;
  cpm: number;
  durationMs: number;
  /** 자동 입력 흔적이 있었는가 */
  assisted: boolean;
}): Promise<TypingActionResult> => {
  const sheet = SHEETS.get(String(input.pageKey));
  const durationMs = toInt(input.durationMs);
  if (!sheet || !(durationMs >= 1000 && durationMs <= 3_600_000))
    return { ok: false, message: '기록을 저장하지 못했어요.' };

  const typer = await currentTyper(false);
  const user = typer?.user;
  if (!typer || !user)
    return { ok: false, message: '로그인하면 기록이 남아요.' };
  if (isDemoUser(user)) return { ok: false, message: DEMO_READ_ONLY_MESSAGE };

  // 타수·정확도는 서버가 다시 정한다(HJ 2026-11-26 B안) — 시간 기록이 없거나 자동 입력이면 타수 0(진행도만)
  const check = checkTypingRecord({
    text: sheet.text,
    typed: input.typed,
    clientCpm: input.cpm,
    serverWindowMs: readWindowMs(input.token, typer.owner, sheet.key),
    assisted: input.assisted === true,
  });
  if (!check.ok) return { ok: false, message: '기록을 저장하지 못했어요.' };
  if (check.clipped || !check.rankable)
    console.warn('필사 기록 타수 조정:', {
      page: sheet.key,
      clipped: check.clipped,
      assisted: input.assisted === true,
      hasToken: typeof input.token === 'string',
    });

  const supabase = await createClient();
  const h = await headers();
  const { error } = await supabase.rpc('record_typing_page', {
    p_work: LITTLE_PRINCE_WORK,
    p_page_key: sheet.key,
    p_chars: sheet.text.length,
    p_cpm: check.cpm,
    p_accuracy: check.accuracy,
    p_duration_ms: durationMs,
    // 순위표 "모바일" 표시용 — 화면 값 대신 요청 헤더로 정한다
    p_device: deviceFromHeaders((name) => h.get(name)),
  });
  if (error) {
    console.warn('필사 기록 저장 실패:', error.message);
    return { ok: false, message: '기록을 저장하지 못했어요.' };
  }
  return { ok: true };
};

export const setTypingRankOptInAction = async (
  on: boolean
): Promise<TypingActionResult> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: '로그인이 필요해요.' };
  if (isDemoUser(user)) return { ok: false, message: DEMO_READ_ONLY_MESSAGE };

  const { error } = await supabase.rpc('set_typing_rank_opt_in', {
    p_on: on === true,
  });
  if (error) {
    console.warn('필사 순위 참여 변경 실패:', error.message);
    return { ok: false, message: '바꾸지 못했어요. 다시 시도해 주세요.' };
  }
  return { ok: true };
};
