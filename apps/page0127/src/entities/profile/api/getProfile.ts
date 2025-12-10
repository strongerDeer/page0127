import { createClient } from '@/shared/config/supabase/server';

import type { Profile } from '../types';

/**
 * 사용자 프로필 조회 (Server Component용)
 *
 * 학습 포인트:
 * - Server Component에서 직접 Supabase 호출
 * - profiles 테이블이 없으면 자동 생성
 * - reading_goal은 JSONB 타입
 *
 * @param userId - 사용자 ID
 * @returns 프로필 정보
 */
export const getProfile = async (userId: string): Promise<Profile | null> => {
  const supabase = await createClient();

  // 1. 프로필 조회
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    // 프로필이 없으면 null 반환 (에러 로그만 출력)
    console.error('프로필 조회 실패:', error.message);
    return null;
  }

  return profile;
};

/**
 * 프로필 생성 또는 업데이트 (upsert)
 *
 * 학습 포인트:
 * - 처음 로그인한 사용자는 프로필이 없을 수 있음
 * - upsert로 자동 생성/업데이트
 *
 * @param userId - 사용자 ID
 * @param email - 사용자 이메일
 */
export const upsertProfile = async (
  userId: string,
  email: string
): Promise<void> => {
  const supabase = await createClient();

  await supabase.from('profiles').upsert(
    {
      id: userId,
      email,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'id',
    }
  );
};
