import { redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

import { getProfile } from '@/entities/profile/api/getProfile';

/**
 * 옛 경로 호환용 리다이렉트 — 도서 목록은 이제 /{username} 하나뿐이다.
 * (protected)/layout.tsx가 로그인을 이미 보장하므로 여기선 프로필만 조회한다.
 * /dashboard를 거치지 않고 바로 최종 목적지로 보내 리다이렉트를 한 번으로 줄인다.
 */
const BooksPage = async () => {
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

export default BooksPage;
