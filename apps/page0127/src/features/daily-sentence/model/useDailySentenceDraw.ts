'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';
import { toKstDateKey } from '@/shared/lib/date';
import { useLocalStorage } from '@/shared/lib/hooks/useLocalStorage';

import { dailyScore } from '@/entities/daily-sentence';

import { drawDailySentenceAction } from '../api/drawDailySentenceAction';

import type { DailySentence } from '@/entities/daily-sentence';

/** 비회원 브라우저 열쇠 — 오늘의 문장·점수를 "이 브라우저"에 묶는다. 개인정보가 아닌 무작위 문자열 */
const GUEST_KEY = 'page0127:sentence-key';
/** 비회원이 오늘 펼친 결과 — 다시 열면 연출 없이 바로 보여 준다 */
const GUEST_TODAY = 'page0127:sentence-today';
/** 비회원이 뽑은 날짜들(최근 14일) — 랜딩의 "이번 주 내 기록" */
const GUEST_DAYS = 'page0127:sentence-days';
/**
 * 이 브라우저에서 마지막으로 뽑은 날(회원·비회원 공통) — 홈 당근 말풍선이 "오늘의 문장 보기"로 바뀐다.
 * 홈은 모두에게 같은 화면으로 캐시되므로 서버가 아니라 브라우저가 판단한다.
 */
export const LAST_DRAWN_KEY = 'page0127:sentence-drawn';

const KEEP_DAYS = 14;

export type DrawnSentence = {
  sentence: DailySentence;
  bookHref: string | null;
};

export type DrawOutcome =
  ({ ok: true } & DrawnSentence) | { ok: false; message: string };

type GuestToday = ({ date: string } & DrawnSentence) | null;

type Options = {
  /** 로그인한 사람 — 있으면 기록하는 뽑기(서버 액션), 없으면 비회원 뽑기(GET /api/sentence/today) */
  memberId: string | null;
  /** 회원이 오늘 이미 펼친 문장(서버가 읽어 준다) */
  today: DailySentence | null;
  todayBookHref: string | null;
  /** 통계용 — 어디서 뽑았는지 */
  place: 'modal' | 'landing';
};

const newGuestKey = () => crypto.randomUUID().replaceAll('-', '');

/**
 * 오늘의 문장 뽑기 상태 — /sentence 랜딩과 서재 모달의 SentenceBook 이 쓴다.
 *
 * - 회원: drawDailySentenceAction — 안 본 문장 중 무작위, 캘린더에 기록. 끝나면 router.refresh() 로 뒤 화면을 맞춘다.
 * - 비회원: 브라우저 열쇠로 GET /api/sentence/today — 같은 열쇠·같은 날이면 늘 같은 문장. DB 에 남기지 않는다.
 * - 점수는 날짜 + 사람(회원 id / 브라우저 열쇠)으로 정하는 순수 계산(dailyScore).
 *
 * 연출은 화면마다 다르므로 여기서는 "받아 오기(fetchDraw)"와 "결과 확정(commit)"만 나눠 준다 —
 * 화면이 연출과 fetchDraw 를 함께 기다린 뒤 commit 한다.
 */
export const useDailySentenceDraw = ({
  memberId,
  today,
  todayBookHref,
  place,
}: Options) => {
  const router = useRouter();
  const [guestKey, setGuestKey] = useLocalStorage<string | null>(
    GUEST_KEY,
    null
  );
  const [guestToday, setGuestToday] = useLocalStorage<GuestToday>(
    GUEST_TODAY,
    null
  );
  const [guestDays, setGuestDays] = useLocalStorage<string[]>(GUEST_DAYS, []);
  const [, setLastDrawn] = useLocalStorage<string | null>(LAST_DRAWN_KEY, null);

  // 이번 화면에서 펼친 결과 — 회원은 서버가 준 오늘 문장으로 시작한다
  const [drawn, setDrawn] = useState<DrawnSentence | null>(
    today ? { sentence: today, bookHref: todayBookHref } : null
  );

  const todayKey = toKstDateKey(new Date());
  // 비회원이 오늘 이미 펼쳤으면(이 브라우저) 그 결과를 그대로 보여 준다
  const guestResult =
    !memberId && guestToday?.date === todayKey ? guestToday : null;
  const result = drawn ?? guestResult;

  const seed = memberId ?? guestKey;
  const score = result && seed ? dailyScore(todayKey, seed) : null;

  const drawAsGuest = async (): Promise<DrawOutcome> => {
    const key = guestKey ?? newGuestKey();
    if (!guestKey) setGuestKey(key);
    const res = await fetch(
      `/api/sentence/today?key=${encodeURIComponent(key)}`
    );
    const body = (await res.json().catch(() => null)) as {
      sentence?: DailySentence;
      bookHref?: string | null;
      error?: string;
    } | null;
    if (!res.ok || !body?.sentence) {
      return {
        ok: false,
        message: body?.error ?? '문장을 펼치지 못했어요. 다시 시도해 주세요.',
      };
    }
    const bookHref = body.bookHref ?? null;
    setGuestToday({ date: todayKey, sentence: body.sentence, bookHref });
    setGuestDays((prev) =>
      [...new Set([...prev, todayKey])].sort().slice(-KEEP_DAYS)
    );
    return { ok: true, sentence: body.sentence, bookHref };
  };

  /** 문장을 받아 온다 — 화면에는 아직 그리지 않는다 */
  const fetchDraw = (): Promise<DrawOutcome> =>
    memberId ? drawDailySentenceAction() : drawAsGuest();

  /** 받아 온 결과를 화면에 확정한다 */
  const commit = (outcome: DrawnSentence) => {
    setDrawn(outcome);
    setLastDrawn(todayKey);
    trackEvent('daily_sentence_draw', { member: Boolean(memberId), place });
    // 뒤 화면(서재 배너·캘린더 책갈피)을 다시 그린다 — 모달이 떠 있어도 그대로 유지된다
    if (memberId) router.refresh();
  };

  return { result, score, seed, todayKey, guestDays, fetchDraw, commit };
};
