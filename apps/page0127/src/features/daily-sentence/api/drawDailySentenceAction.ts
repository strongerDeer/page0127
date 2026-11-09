'use server';

import { createClient } from '@/shared/config/supabase/server';

import { getBookInfoId, sentenceBookHref } from '@/entities/daily-sentence';

import type { DailySentence } from '@/entities/daily-sentence';

export type DrawResult =
  | { ok: true; sentence: DailySentence; bookHref: string | null }
  | { ok: false; message: string };

/**
 * 오늘의 문장 펼치기 (Server Action)
 *
 * 규칙은 전부 DB 함수 draw_daily_sentence() 에 있다(마이그레이션 20261109000200):
 * 오늘(KST) 이미 뽑았으면 같은 문장, 아니면 안 본 문장 중 무작위, 하루 한 줄은 PK 가 보장.
 * 여기서는 로그인 확인과 결과 모양만 맞춘다 — 같은 규칙을 두 곳에 쓰지 않는다.
 */
export const drawDailySentenceAction = async (): Promise<DrawResult> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: '로그인이 필요합니다.' };

  const { data, error } = await supabase
    .rpc('draw_daily_sentence')
    .maybeSingle<DailySentence>();

  if (error) {
    console.error('오늘의 문장 뽑기 실패:', error.message);
    return {
      ok: false,
      message: '문장을 펼치지 못했어요. 다시 시도해 주세요.',
    };
  }
  if (!data) return { ok: false, message: '오늘은 펼칠 문장이 없어요.' };

  // 카드는 펼친 뒤 받은 값으로 그린다(router.refresh 가 와도 useState 는 그대로) — 링크도 함께 준다
  const bookHref = sentenceBookHref(
    data,
    await getBookInfoId(supabase, data.isbn)
  );
  return { ok: true, sentence: data, bookHref };
};
