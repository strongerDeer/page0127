import type { FollowStats } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';

export type FollowSnapshot = {
  stats: FollowStats;
  /** 보는 사람이 이 서재 주인을 팔로우하는지 — 비로그인·본인이면 false */
  isFollowing: boolean;
};

/**
 * 서재 첫 화면에 그릴 팔로우 숫자·팔로우 여부를 서버에서 한 번에 읽는다.
 *
 * 예전엔 화면이 뜬 뒤 브라우저가 /api/follows/:id/stats·is-following 을 따로 불러,
 * 새로고침할 때마다 숫자 자리가 '–' 였다가 채워지고 버튼이 '팔로우'로 잠깐 보였다.
 * React Query 캐시는 메모리라 새로고침하면 비기 때문에 브라우저 캐시로는 못 막는다 →
 * 서버가 HTML 을 그릴 때 같이 읽어 initialData 로 넘긴다(쿼리는 API 라우트와 같다).
 * 실패해도 서재는 떠야 하므로 null 을 돌려주고, 그때는 예전처럼 브라우저가 불러온다.
 */
export const getFollowSnapshot = async (
  supabase: SupabaseClient,
  userId: string,
  viewerId: string | null
): Promise<FollowSnapshot | null> => {
  const checkFollowing = viewerId !== null && viewerId !== userId;

  const [statsResult, followingResult] = await Promise.all([
    supabase
      .from('user_follow_stats')
      .select('followers_count, following_count')
      .eq('user_id', userId)
      .maybeSingle(),
    checkFollowing
      ? supabase
          .from('follows')
          .select('id')
          .eq('follower_id', viewerId)
          .eq('following_id', userId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (statsResult.error || followingResult.error) return null;

  return {
    // 팔로우가 한 번도 없으면 뷰에 행이 없다 — API 라우트와 같이 0 으로 본다
    stats: statsResult.data ?? { followers_count: 0, following_count: 0 },
    isFollowing: Boolean(followingResult.data),
  };
};
