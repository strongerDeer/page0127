'use server';

import { createClient } from '@/shared/config/supabase/server';

import { isCurrentYearGoal, shouldClaimGoal } from '../model/claim';
import { isValidGoal } from '../model/pendingShelf';

import type { PendingGoal } from '../model/types';

/**
 * 맛보기에서 정한 목표를 넣는다 — 올해 목표가 비어 있을 때만.
 *
 * 기존 updateReadingGoalAction 을 쓰지 않는 이유: 그쪽은 설정 화면용이라 무조건 덮어쓴다.
 * 학습 포인트: 서버 액션 인자는 클라이언트가 보낸 값이다 → 여기서 다시 검증한다.
 */
export const claimReadingGoalAction = async (
  goal: PendingGoal
): Promise<boolean> => {
  if (!isValidGoal(goal)) return false;
  if (!isCurrentYearGoal(goal, new Date())) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile, error: readError } = await supabase
    .from('profiles')
    .select('reading_goal')
    .eq('id', user.id)
    .single();
  if (readError) {
    console.error('맛보기 목표 조회 실패:', readError.message);
    return false;
  }
  if (!shouldClaimGoal(profile?.reading_goal, goal.year)) return false;

  const { error } = await supabase
    .from('profiles')
    .update({
      reading_goal: { year: goal.year, target: goal.target },
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);
  if (error) {
    console.error('맛보기 목표 저장 실패:', error.message);
    return false;
  }
  return true;
};
