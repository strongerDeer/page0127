import { notFound } from 'next/navigation';

import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';

import { getProfileByUsername } from '@/entities/profile/api/getProfileByUsername';

import { BookEditPageClient } from '@/widgets/book/ui/BookEditPageClient';

import type { Metadata } from 'next';

type PageProps = {
  params: Promise<{ username: string; bookId: string }>;
};

/**
 * 책 수정 페이지 진입점 (Server Component)
 *
 * 소유자 검증만 여기서 하고, 실제 폼 로직은 BookEditPageClient에 위임한다.
 * 소유자가 아니면 폼 자체를 렌더링하지 않고 404.
 */
const BookEditPage = async ({ params }: PageProps) => {
  const { username, bookId } = await params;

  const [profile, currentUser] = await Promise.all([
    getProfileByUsername(username),
    getCurrentUser(),
  ]);

  if (!profile || currentUser?.id !== profile.id) {
    notFound();
  }

  return <BookEditPageClient bookId={bookId} username={username} />;
};

export default BookEditPage;

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};
