import { cookies } from 'next/headers';

import { createClient } from '@/shared/config/supabase/server';
import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';

import { getProfile } from '@/entities/profile/api/getProfile';
import { LITTLE_PRINCE_WORK } from '@/entities/typing';

import { GUEST_COOKIE, isGuestId } from '../lib/guestCookie';

import type {
  TypingBoard,
  TypingRankRow,
  TypingRecord,
} from '@/entities/typing';

import 'server-only';

export type TypingState = {
  memberId: string | null;
  libraryHref: string | null;
  /** 내가 다 쓴 쪽들(회원만) */
  records: TypingRecord[];
  /** 순위 참여를 켰는가 */
  rankOptIn: boolean;
  rankings: Record<TypingBoard, TypingRankRow[]>;
};

type RankRpcRow = {
  nickname: string;
  is_me: boolean;
  is_guest: boolean;
  value: number;
  page_key: string | null;
};

const fetchRanking = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  board: TypingBoard,
  guestId: string | null
): Promise<TypingRankRow[]> => {
  const { data, error } = await supabase.rpc('get_typing_ranking', {
    p_work: LITTLE_PRINCE_WORK,
    p_board: board,
    p_limit: 100,
    // 비회원이면 쿠키 id — 자기 줄에 "(나)"가 붙는다
    p_guest_id: guestId,
  });
  if (error) {
    // 랭킹이 안 떠도 필사는 할 수 있어야 한다 — 빈 목록으로 그린다
    console.warn('필사 랭킹 불러오기 실패:', error.message);
    return [];
  }
  return ((data ?? []) as RankRpcRow[]).map((row) => ({
    nickname: row.nickname,
    isMe: row.is_me,
    isGuest: row.is_guest,
    value: row.value,
    pageKey: row.page_key,
  }));
};

/**
 * /typing/little-prince 가 처음 그릴 때 필요한 것.
 *
 * 비회원은 진행도 기록이 없다(로그인한 계정만 — HJ 2026-11-25). 랭킹은 누구나 보고,
 * 비회원도 닉네임으로 타수 랭킹에만 오를 수 있다(HJ 2026-11-26) — 쿠키 id 로 내 줄을 찾는다.
 * 내 기록은 쪽마다 한 줄이라 전부 읽어도 가볍다(전문 27장 ≈ 150줄 + 명문장).
 */
export const getTypingState = async (): Promise<TypingState> => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const cookieGuestId = (await cookies()).get(GUEST_COOKIE)?.value;
  const guestId = !user && isGuestId(cookieGuestId) ? cookieGuestId : null;

  const rankingsPromise = Promise.all([
    fetchRanking(supabase, 'steady', guestId),
    fetchRanking(supabase, 'speed', guestId),
  ]);

  if (!user) {
    const [steady, speed] = await rankingsPromise;
    return {
      memberId: null,
      libraryHref: null,
      records: [],
      rankOptIn: false,
      rankings: { steady, speed },
    };
  }

  const [[steady, speed], recordsResult, optInResult, profile] =
    await Promise.all([
      rankingsPromise,
      supabase
        .from('typing_records')
        .select('page_key, cpm, accuracy, best_cpm, completed_at')
        .eq('user_id', user.id)
        .eq('work', LITTLE_PRINCE_WORK),
      supabase
        .from('profiles')
        .select('typing_rank_opt_in')
        .eq('id', user.id)
        .maybeSingle<{ typing_rank_opt_in: boolean }>(),
      getProfile(user.id),
    ]);

  if (recordsResult.error)
    console.warn('필사 기록 불러오기 실패:', recordsResult.error.message);

  return {
    memberId: user.id,
    libraryHref: profile?.username ? `/${profile.username}` : null,
    records: (recordsResult.data ?? []) as TypingRecord[],
    rankOptIn: optInResult.data?.typing_rank_opt_in ?? false,
    rankings: { steady, speed },
  };
};
