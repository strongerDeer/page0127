import { cache } from 'react';

import { createClient } from '@/shared/config/supabase/server';
import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';
import { isDemoUser } from '@/shared/lib/demo/demoAccount';

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

    // 체험 계정의 서재는 체험 중인 사람에게만 보인다. 다른 사람·로그아웃한 사람에게는
    // "없는 서재"(404)다 — 책은 RLS 로 이미 0권이라, 그대로 두면 빈 서재가 열려 검색에도
    // 걸릴 수 있다. 로그인 확인은 체험 계정일 때만 한다(다른 서재는 추가 비용 없음).
    if (data?.is_demo && !isDemoUser(await getCurrentUser())) {
      return null;
    }

    return data;
  }
);
