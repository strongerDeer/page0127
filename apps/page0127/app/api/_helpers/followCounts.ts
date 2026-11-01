import type { SupabaseClient } from '@supabase/supabase-js';

export type FollowCounts = {
  followers_count: number;
  following_count: number;
};

type FollowStatsRow = {
  user_id: string;
  followers_count: number | string | null;
  following_count: number | string | null;
};

const ZERO: FollowCounts = { followers_count: 0, following_count: 0 };

/**
 * user_follow_stats 뷰 행 → user_id 별 숫자 맵.
 * COUNT(*) 는 bigint 라 문자열로 올 수도 있어 Number 로 맞춘다.
 */
export const toFollowCountMap = (
  rows: FollowStatsRow[] | null | undefined
): Map<string, FollowCounts> =>
  new Map(
    (rows ?? []).map((row) => [
      row.user_id,
      {
        followers_count: Number(row.followers_count) || 0,
        following_count: Number(row.following_count) || 0,
      },
    ])
  );

export const pickFollowCounts = (
  map: Map<string, FollowCounts>,
  userId: string
): FollowCounts => map.get(userId) ?? ZERO;

/**
 * 여러 사용자의 팔로워/팔로잉 수를 한 번에 읽는다 (팔로워·팔로잉 목록 카드용).
 * 실패해도 목록 자체는 보여야 하므로 빈 맵(= 0)으로 돌린다.
 */
export async function getFollowCountMap(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, FollowCounts>> {
  if (userIds.length === 0) return new Map();
  const { data } = await supabase
    .from('user_follow_stats')
    .select('user_id, followers_count, following_count')
    .in('user_id', userIds);
  return toFollowCountMap(data as FollowStatsRow[] | null);
}
