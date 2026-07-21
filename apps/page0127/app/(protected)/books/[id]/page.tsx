import { redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

import { getProfile } from '@/entities/profile/api/getProfile';

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * 옛 경로 호환용 리다이렉트 — 책 상세는 이제 /{username}/{bookId} 하나뿐이다.
 * 북마크·외부 링크로 들어오는 사람들을 위해 완전히 지우지 않고 여기서 보내준다.
 * (protected)/layout.tsx가 로그인을 이미 보장하므로 여기선 프로필만 조회한다.
 */
const LegacyBookDetailRedirect = async ({ params }: PageProps) => {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = await getProfile(user!.id);

  if (!profile?.username) {
    redirect('/login');
  }

  redirect(`/${profile.username}/${id}`);
};

export default LegacyBookDetailRedirect;
