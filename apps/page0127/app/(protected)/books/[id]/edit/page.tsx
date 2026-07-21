import { redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

import { getProfile } from '@/entities/profile/api/getProfile';

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * 옛 경로 호환용 리다이렉트 — 책 수정은 이제 /{username}/{bookId}/edit 하나뿐이다.
 * (protected)/layout.tsx가 로그인을 이미 보장하므로 여기선 프로필만 조회한다.
 */
const LegacyBookEditRedirect = async ({ params }: PageProps) => {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = await getProfile(user!.id);

  if (!profile?.username) {
    redirect('/login');
  }

  redirect(`/${profile.username}/${id}/edit`);
};

export default LegacyBookEditRedirect;
