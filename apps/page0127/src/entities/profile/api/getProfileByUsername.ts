import { createClient } from '@/shared/config/supabase/server';

import type { Profile } from '../types';

/**
 * username으로 프로필 조회 (공개 서재용)
 *
 * 학습 포인트:
 * - username은 unique하므로 단일 레코드 조회
 * - 공개 서재에서 사용 (누구나 접근 가능)
 */
export const getProfileByUsername = async (
  username: string
): Promise<Profile | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    console.error('프로필 조회 실패:', error.message);
    return null;
  }

  return data;
};
