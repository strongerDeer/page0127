import { createClient } from '@/shared/config/supabase/server';

import type { PublicTasteHistoryItem } from '../types';

/**
 * 서재 주인의 취향 이력(최신순 최대 10건) — 방문자도 볼 수 있는 칸만.
 *
 * taste_analyses 테이블은 RLS 로 본인만 읽을 수 있다. 공개해도 되는 칸만 돌려주는
 * get_public_taste_history(SECURITY DEFINER) 를 부른다.
 * 실패하면 빈 배열: 취향 카드만 사라지고 서재는 그대로 보인다.
 */
export const getPublicTasteHistory = async (
  userId: string
): Promise<PublicTasteHistoryItem[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_public_taste_history', {
    p_user_id: userId,
  });

  if (error) {
    console.error('취향 이력 조회 실패:', error.message);
    return [];
  }
  return (data as PublicTasteHistoryItem[] | null) ?? [];
};
