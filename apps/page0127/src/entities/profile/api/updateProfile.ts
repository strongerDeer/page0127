'use client';

import { createClient } from '@/shared/config/supabase/client';

import type { ReadingGoal, UpdateProfileDto } from '../types';

/**
 * 연간 독서 목표 업데이트 (Client Component용)
 *
 * 학습 포인트:
 * - Client Component에서 Supabase 호출
 * - JSONB 컬럼 업데이트
 * - 낙관적 업데이트 패턴 (선택 사항)
 *
 * @param userId - 사용자 ID
 * @param goal - 독서 목표 { year, target }
 */
export const updateReadingGoal = async (
  userId: string,
  goal: ReadingGoal
): Promise<boolean> => {
  const supabase = createClient();

  const { error } = await supabase
    .from('profiles')
    .update({
      reading_goal: goal,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('독서 목표 업데이트 실패:', error.message);
    return false;
  }

  return true;
};

/**
 * 프로필 정보 업데이트 (닉네임, 소개, 프로필 이미지)
 *
 * 학습 포인트:
 * - 부분 업데이트 패턴 (Partial<T>)
 * - 여러 필드를 한 번에 업데이트
 * - username은 중복 체크 필요 (추후 구현)
 *
 * @param userId - 사용자 ID
 * @param data - 업데이트할 프로필 정보
 */
export const updateProfile = async (
  userId: string,
  data: UpdateProfileDto
): Promise<boolean> => {
  const supabase = createClient();

  const { error } = await supabase
    .from('profiles')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('프로필 업데이트 실패:', error.message);
    return false;
  }

  return true;
};
