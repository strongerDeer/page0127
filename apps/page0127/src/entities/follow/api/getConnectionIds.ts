import { createClient } from '@/shared/config/supabase/server';

import { type FollowEdge, toConnectionIds } from '../model/connections';

import 'server-only';

/**
 * 나와 팔로우로 이어진 사람(+나) id.
 * follows 는 "Anyone can view follows" 정책이라 별도 RPC 없이 읽힌다.
 *
 * 실패하면 나만 돌려준다 — 모르는 사람을 드러내는 쪽이 아니라 숨기는 쪽으로 닫는다.
 */
export const getConnectionIds = async (myId: string): Promise<string[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id, following_id')
    .or(`follower_id.eq.${myId},following_id.eq.${myId}`);

  if (error) {
    console.warn(`[getConnectionIds] 팔로우 조회 실패: ${error.message}`);
    return [myId];
  }
  return [...toConnectionIds((data ?? []) as FollowEdge[], myId)];
};
