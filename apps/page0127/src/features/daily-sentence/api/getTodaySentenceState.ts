import { createClient } from '@/shared/config/supabase/server';
import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';
import { toKstDateKey } from '@/shared/lib/date';

import {
  getBookInfoId,
  getDailySentences,
  sentenceBookHref,
} from '@/entities/daily-sentence';
import { getProfile } from '@/entities/profile/api/getProfile';

import type { DailySentence } from '@/entities/daily-sentence';

import 'server-only';

export type TodaySentenceState = {
  memberId: string | null;
  today: DailySentence | null;
  todayBookHref: string | null;
  /** 회원이 뽑은 날짜(최근 14일, KST 'YYYY-MM-DD') — 랜딩의 "이번 주 내 기록". 비회원은 빈 배열(브라우저가 채운다) */
  drawDates: string[];
  /** 회원 서재 주소 — 랜딩에서 가입 버튼 대신 "내 서재 캘린더 보기" */
  libraryHref: string | null;
};

const RECENT_DAYS = 14;

/**
 * /sentence 페이지와 모달이 처음 그릴 때 필요한 것 — 누구인지, (회원이면) 오늘 이미 펼친 문장.
 *
 * 비회원은 서버가 알 것이 없다(오늘 결과는 그 브라우저에만 있다) → 닫힌 책으로 시작해 브라우저가 이어 받는다.
 * 회원 기록은 하루 한 줄이라 전부 읽어도 가볍다(getDailySentences, RLS 가 내 것만 연다).
 */
export const getTodaySentenceState = async (): Promise<TodaySentenceState> => {
  const user = await getCurrentUser();
  if (!user)
    return {
      memberId: null,
      today: null,
      todayBookHref: null,
      drawDates: [],
      libraryHref: null,
    };

  const supabase = await createClient();
  const todayKey = toKstDateKey(new Date());
  const [draws, profile] = await Promise.all([
    getDailySentences(supabase, user.id),
    getProfile(user.id),
  ]);
  const today = draws.find((draw) => draw.draw_date === todayKey) ?? null;
  const todayBookHref = today
    ? sentenceBookHref(today, await getBookInfoId(supabase, today.isbn))
    : null;

  const since = toKstDateKey(new Date(Date.now() - RECENT_DAYS * 86_400_000));
  const drawDates = draws
    .map((draw) => draw.draw_date)
    .filter((date) => date > since);

  return {
    memberId: user.id,
    today,
    todayBookHref,
    drawDates,
    libraryHref: profile?.username ? `/${profile.username}` : null,
  };
};
