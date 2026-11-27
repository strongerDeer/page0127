'use server';

import { createClient } from '@/shared/config/supabase/server';
import { isDemoUser } from '@/shared/lib/demo/demoAccount';

import {
  CHEER_SENTENCES,
  CHEER_YEAR,
  type CheerSentence,
  findCheerSentence,
  pickCheerSentence,
} from '@/entities/year-cheer';

export type OpenCheerResult =
  { ok: true; sentence: CheerSentence } | { ok: false; message: string };

/** 체험 계정용 — 저장하지 않고 계정 id 로 늘 같은 한 줄을 고른다 */
const demoSentence = (userId: string): CheerSentence => {
  let hash = 0;
  for (const ch of userId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return CHEER_SENTENCES[hash % CHEER_SENTENCES.length];
};

/**
 * 선물 상자 열기 (Server Action) — 처음이면 무작위로 한 줄을 골라 저장하고, 이미 열었으면 그 줄을 돌려준다.
 *
 * "처음 열 때 저장"(HJ 2026-11-27, 2번 B): INSERT … ON CONFLICT DO NOTHING 으로 넣고 다시 읽는다.
 * 두 탭에서 동시에 눌러도 기본 키(user_id, year)가 한 줄만 남기고, 둘 다 **먼저 들어간 줄**을 받는다.
 */
export const openYearCheerAction = async (): Promise<OpenCheerResult> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: '로그인하면 선물을 열 수 있어요.' };

  // 체험 계정은 DB 에 쓰지 못한다(트리거가 막는다) — 열어 보는 경험만 준다
  if (isDemoUser(user)) return { ok: true, sentence: demoSentence(user.id) };

  const picked = pickCheerSentence();
  const { error: insertError } = await supabase
    .from('year_cheers')
    .upsert(
      { user_id: user.id, year: CHEER_YEAR, sentence_id: picked.id },
      { onConflict: 'user_id,year', ignoreDuplicates: true }
    );
  if (insertError) {
    console.error('응원 문장 저장 실패:', insertError.message);
    return { ok: false, message: '선물을 열지 못했어요. 다시 눌러 주세요.' };
  }

  const { data } = await supabase
    .from('year_cheers')
    .select('sentence_id')
    .eq('user_id', user.id)
    .eq('year', CHEER_YEAR)
    .maybeSingle<{ sentence_id: string }>();

  const sentence = data ? findCheerSentence(data.sentence_id) : undefined;
  return { ok: true, sentence: sentence ?? picked };
};
