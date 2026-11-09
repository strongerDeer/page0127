import { cache } from 'react';

import { createClient } from '@/shared/config/supabase/server';

import { PROFILE_PUBLIC_COLUMNS } from './profileColumns';

import type { Profile } from '../types';

/**
 * username으로 프로필 조회 (공개 서재용)
 *
 * 학습 포인트:
 * - username은 unique하므로 단일 레코드 조회
 * - 공개 서재에서 사용 (누구나 접근 가능)
 *
 * React cache() 로 감싼 이유:
 * 서재·책 상세는 한 요청 안에서 generateMetadata 와 page 가 둘 다 이 프로필을 찾는다.
 * cache() 는 **같은 요청 안에서** 같은 인자의 호출을 한 번으로 합친다(요청이 끝나면 버려져
 * 다음 요청은 다시 읽는다 — 무효화를 신경 쓸 필요가 없다).
 */
export const getProfileByUsername = cache(
  async (username: string): Promise<Profile | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_PUBLIC_COLUMNS)
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('프로필 조회 실패:', error.message);
      return null;
    }

    return data;
  }
);
