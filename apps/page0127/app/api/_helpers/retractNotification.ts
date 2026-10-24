import type { SupabaseClient } from '@supabase/supabase-js';

type RetractFilter = {
  /** 취소한 사람(= 알림을 만든 사람). RLS 도 auth.uid() = actor_id 일 때만 지우게 한다 */
  actorId: string;
  type: 'follow' | 'like' | 'comment';
  /** 좋아요·댓글: 책(또는 전역 책) id */
  targetId?: string;
  /** 팔로우: 받는 사람 id */
  userId?: string;
};

/**
 * 취소한 행동의 알림을 거둔다 — 받는 사람이 **아직 안 읽은 것만.**
 *
 * 이미 읽은 알림은 남긴다. 본 것을 지우면 "방금 본 알림이 사라졌다"는 더 이상한
 * 경험이 되고, 본 사실 자체는 되돌릴 수 없다. 푸시로 이미 나간 알림도 되돌릴 수 없다.
 *
 * 실패해도 취소 자체는 성공이다 — 알림 정리는 부수 효과라 응답을 막지 않는다.
 * (RLS: 20261023000000 의 "Actors can retract unread notifications")
 */
export const retractUnreadNotifications = async (
  supabase: SupabaseClient,
  { actorId, type, targetId, userId }: RetractFilter
): Promise<void> => {
  let query = supabase
    .from('notifications')
    .delete()
    .eq('actor_id', actorId)
    .eq('type', type)
    .eq('is_read', false);

  if (targetId) query = query.eq('target_id', targetId);
  if (userId) query = query.eq('user_id', userId);

  const { error } = await query;
  if (error) {
    console.error(`[notifications] ${type} 알림 회수 실패:`, error.message);
  }
};
