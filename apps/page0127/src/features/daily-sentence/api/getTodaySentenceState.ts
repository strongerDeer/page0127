import { createClient } from '@/shared/config/supabase/server';
import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';
import { toKstDateKey } from '@/shared/lib/date';

import {
  getBookInfoId,
  getDailySentences,
  sentenceBookHref,
} from '@/entities/daily-sentence';

import type { DailySentence } from '@/entities/daily-sentence';

import 'server-only';

export type TodaySentenceState = {
  memberId: string | null;
  today: DailySentence | null;
  todayBookHref: string | null;
};

/**
 * /sentence 페이지와 모달이 처음 그릴 때 필요한 것 — 누구인지, (회원이면) 오늘 이미 펼친 문장.
 *
 * 비회원은 서버가 알 것이 없다(오늘 결과는 그 브라우저에만 있다) → 닫힌 책으로 시작해 브라우저가 이어 받는다.
 * 회원 기록은 하루 한 줄이라 전부 읽어도 가볍다(getDailySentences, RLS 가 내 것만 연다).
 */
export const getTodaySentenceState = async (): Promise<TodaySentenceState> => {
  const user = await getCurrentUser();
  if (!user) return { memberId: null, today: null, todayBookHref: null };

  const supabase = await createClient();
  const todayKey = toKstDateKey(new Date());
  const draws = await getDailySentences(supabase, user.id);
  const today = draws.find((draw) => draw.draw_date === todayKey) ?? null;
  const todayBookHref = today
    ? sentenceBookHref(today, await getBookInfoId(supabase, today.isbn))
    : null;

  return { memberId: user.id, today, todayBookHref };
};
