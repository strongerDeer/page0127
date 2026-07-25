import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

import { getProfile } from '@/entities/profile/api/getProfile';

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * 옛 경로 호환용 리다이렉트 — 책 상세는 이제 /{username}/{bookId} 하나뿐이다.
 * 북마크·외부 링크로 들어오는 사람들을 위해 완전히 지우지 않고 여기서 보내준다.
 * 책 소유자의 username으로 리다이렉트해서, 소유자든 방문자든 올바른 공개 상세 페이지로 간다.
 * RLS가 공개 책·본인 책만 보여주므로, 없으면 권한이 없는 것 또는 비공개 책이다.
 */
const LegacyBookDetailRedirect = async ({ params }: PageProps) => {
  const { id } = await params;
  const supabase = await createClient();

  // 책 소유자 조회
  const { data: book } = await supabase
    .from('books')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!book) {
    notFound();
  }

  const ownerProfile = await getProfile(book.user_id);

  if (!ownerProfile?.username) {
    notFound();
  }

  redirect(`/${ownerProfile.username}/${id}`);
};

export default LegacyBookDetailRedirect;
