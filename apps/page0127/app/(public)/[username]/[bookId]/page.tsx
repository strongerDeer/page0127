import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';
import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/PageContainer';

import { getProfileByUsername } from '@/entities/profile/api/getProfileByUsername';

import { ArchiveToggleButton } from '@/features/book/ui/ArchiveToggleButton';
import { DeleteBookButton } from '@/features/book/ui/DeleteBookButton';

import { BookDetailContent } from '@/widgets/book/ui/BookDetailContent';

import type { Book } from '@/entities/book';

type PageProps = {
  params: Promise<{ username: string; bookId: string }>;
};

/**
 * 책 상세 페이지 (Server Component)
 *
 * 본인이 보면 소유자 모드(수정·삭제·보관), 남이 보면 방문자 모드(읽기 전용).
 * - 소유자: is_public 여부와 무관하게 자기 책 전부 조회
 * - 방문자: is_public=true인 책만 조회 가능 (아니면 404)
 */
const BookDetailPage = async ({ params }: PageProps) => {
  const { username, bookId } = await params;

  const supabase = await createClient();
  const [
    profile,
    {
      data: { user: currentUser },
    },
  ] = await Promise.all([
    getProfileByUsername(username),
    supabase.auth.getUser(),
  ]);

  if (!profile) {
    notFound();
  }

  const isOwner = currentUser?.id === profile.id;

  let bookQuery = supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .eq('user_id', profile.id);

  if (!isOwner) {
    bookQuery = bookQuery.eq('is_public', true);
  }

  const { data: book } = await bookQuery.single<Book>();

  if (!book) {
    notFound();
  }

  return (
    <PageContainer width='content'>
      <div className='mb-6 flex flex-wrap items-center justify-between gap-3'>
        <Link href={`/${username}`}>
          <Button variant='outline'>← {username}님의 서재로</Button>
        </Link>

        {isOwner && (
          <div className='flex gap-2'>
            <ArchiveToggleButton bookId={book.id} isPublic={book.is_public} />
            <Link href={`/${username}/${book.id}/edit`}>
              <Button variant='outline'>수정</Button>
            </Link>
            <DeleteBookButton bookId={book.id} redirectTo={`/${username}`} />
          </div>
        )}
      </div>

      <BookDetailContent book={book} isOwner={isOwner} />
    </PageContainer>
  );
};

export default BookDetailPage;
