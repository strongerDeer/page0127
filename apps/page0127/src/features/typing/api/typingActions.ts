'use server';

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

/**
 * 온라인 필사 기록 (Server Actions)
 *
 * - 사용자 ID 는 받지 않는다 — DB 함수가 auth.uid() 로 정한다.
 * - 쪽 열쇠는 실제 본문에 있는 것만 받는다. 글자 수도 클라이언트 값 대신 본문에서 센다
 *   → 짧은 글자 수를 보내 타수를 부풀리는 길을 막는다.
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
  cpm: number;
  accuracy: number;
  durationMs: number;
}): Promise<TypingActionResult> => {
  const sheet = SHEETS.get(String(input.pageKey));
  const cpm = toInt(input.cpm);
  const accuracy = toInt(input.accuracy);
  const durationMs = toInt(input.durationMs);
  if (
    !sheet ||
    !(cpm >= 0 && cpm <= 1500) ||
    !(accuracy >= 0 && accuracy <= 100) ||
    !(durationMs >= 1000 && durationMs <= 3_600_000)
  )
    return { ok: false, message: '기록을 저장하지 못했어요.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: '로그인하면 기록이 남아요.' };
  if (isDemoUser(user)) return { ok: false, message: DEMO_READ_ONLY_MESSAGE };

  const { error } = await supabase.rpc('record_typing_page', {
    p_work: LITTLE_PRINCE_WORK,
    p_page_key: sheet.key,
    p_chars: sheet.text.length,
    p_cpm: cpm,
    p_accuracy: accuracy,
    p_duration_ms: durationMs,
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
