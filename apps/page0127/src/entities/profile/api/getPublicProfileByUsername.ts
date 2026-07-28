import { createAnonClient } from '@/shared/config/supabase/anon';

import type { Profile } from '../types';

/**
 * username으로 프로필 조회 — 쿠키를 읽지 않는 버전 (공유 카드·메타데이터용)
 *
 * getProfileByUsername 과 결과는 같다(프로필은 누구나 조회할 수 있다).
 * 다른 것은 **세션을 읽지 않는다는 점**이다. OG 라우트에 `Cache-Control: public` 을
 * 붙이는데 응답이 쿠키에 의존하면 CDN이 캐시해도 되는지 판단이 흔들린다.
 * 공유 카드는 링크를 받은 사람이 볼 것과 같아야 하므로 세션을 아예 지운다.
 */
export const getPublicProfileByUsername = async (
  username: string
): Promise<Profile | null> => {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    console.error('공개 프로필 조회 실패:', error.message);
    return null;
  }

  return data;
};
