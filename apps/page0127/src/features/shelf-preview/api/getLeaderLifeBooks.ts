import { unstable_cache } from 'next/cache';

import { createAnonClient } from '@/shared/config/supabase/anon';

import {
  LEADER_LIFE_BOOKS_LIMIT,
  toLeaderLifeBooks,
} from '../model/leaderLifeBooks';

import type {
  LeaderLifeBook,
  LeaderLifeBookRow,
} from '../model/leaderLifeBooks';

import 'server-only';

/**
 * 공개 서재에서 인생책으로 가장 많이 꼽힌 책 — 홈 하단 인생책 랭킹("리더들이 고른 인생책")과 같은 RPC.
 * 실패하면 던진다 — unstable_cache 는 던진 결과를 저장하지 않으므로 일시 오류가 한 시간 동안
 * 빈 줄로 굳지 않는다(getShelfPicks 와 같은 이유).
 * 쿠키 없는 anon 클라이언트: 모든 방문자에게 같은 결과라 세션이 섞이면 안 된다.
 */
const loadLeaderLifeBooks = async (): Promise<LeaderLifeBook[]> => {
  const { data, error } = await createAnonClient().rpc(
    'get_book_ranking_with_delta',
    { rank_type_param: 'best', limit_count: LEADER_LIFE_BOOKS_LIMIT }
  );
  if (error) throw new Error(error.message);

  return toLeaderLifeBooks(
    (data as LeaderLifeBookRow[] | null) ?? [],
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  );
};

const cachedLeaderLifeBooks = unstable_cache(
  loadLeaderLifeBooks,
  ['shelf-preview', 'leader-life-books'],
  { revalidate: 3600 }
);

/** 이 줄이 없어도 실루엣과 검색은 그대로 쓸 수 있으므로 실패는 빈 목록(줄 숨김)으로 삼킨다 */
export const getLeaderLifeBooks = async (): Promise<LeaderLifeBook[]> => {
  try {
    return await cachedLeaderLifeBooks();
  } catch (error) {
    console.error(
      '[shelf-preview] 리더 인생책 조회 실패:',
      error instanceof Error ? error.message : error
    );
    return [];
  }
};
