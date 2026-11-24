import { createClient } from '@/shared/config/supabase/server';

import type { ReadingGoal } from '../types';

/**
 * 해마다 정한 독서 목표(reading_goals, 오래된 해부터).
 *
 * profiles.reading_goal 은 "지금 목표" 한 칸뿐이라 새 해 목표를 정하면 지난 목표가 덮였다.
 * 2026-11-24부터 profiles 트리거가 목표를 이 표에 해마다 한 행씩 남긴다 → 연도별 완독 추이에 겹쳐 그린다.
 * 목표는 원래 공개라 방문자도 같은 조회를 쓴다(못 채운 목표를 숨기는 건 화면 몫).
 * 실패하면 빈 배열 — 추이 막대만 그리면 된다.
 */
export const getReadingGoals = async (
  userId: string
): Promise<ReadingGoal[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('reading_goals')
    .select('year, target')
    .eq('user_id', userId)
    .order('year');

  if (error) {
    console.error('연도별 목표 조회 실패:', error.message);
    return [];
  }
  return data ?? [];
};
