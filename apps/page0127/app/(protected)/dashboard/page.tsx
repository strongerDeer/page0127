import { redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

import { getProfile } from '@/entities/profile/api/getProfile';

/**
 * 옛 경로 호환용 리다이렉트 — '내 서재'는 이제 /{username} 하나뿐이다.
 * (protected)/layout.tsx가 로그인은 이미 보장하므로 여기선 프로필만 조회한다.
 */
const LegacyDashboardRedirect = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = await getProfile(user!.id);

  if (!profile?.username) {
    redirect('/login');
  }

  redirect(`/${profile.username}`);
};

export default LegacyDashboardRedirect;
