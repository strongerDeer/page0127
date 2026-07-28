import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';
import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/PageContainer';

import { getPublicBookRecord } from '@/entities/book/api/getPublicBookRecord';
import { getProfileByUsername } from '@/entities/profile/api/getProfileByUsername';
import { getPublicProfileByUsername } from '@/entities/profile/api/getPublicProfileByUsername';
import { toDisplayName } from '@/entities/profile/model/displayName';

import { ArchiveToggleButton } from '@/features/book/ui/ArchiveToggleButton';
import { DeleteBookButton } from '@/features/book/ui/DeleteBookButton';

import { BookDetailContent } from '@/widgets/book/ui/BookDetailContent';

import type { Book } from '@/entities/book';
import type { Metadata } from 'next';

type PageProps = {
  params: Promise<{ username: string; bookId: string }>;
};

/**
 * 공유했을 때 보이는 제목·설명.
 *
 * **공개된 기록일 때만 내용을 넣는다.** 아래 본문은 소유자에게 자기 비공개 책도
 * 보여주지만(is_public 조건을 소유자에게만 빼준다), 미리보기는 링크를 받은 사람이
 * 볼 것과 같아야 한다 — 소유자가 비공개 기록 링크를 붙였을 때 한줄평이 카드로
 * 새어 나가면 그건 사용자가 의도한 공개가 아니다.
 * OG 이미지도 같은 규칙으로 같은 폴더의 opengraph-image.tsx 가 그린다.
 */
export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { username, bookId } = await params;
  const profile = await getPublicProfileByUsername(username);

  if (!profile) {
    return { title: '책장을 찾을 수 없습니다 | page0127' };
  }

  const book = await getPublicBookRecord(profile.id, bookId);

  if (!book) {
    return { title: '기록을 찾을 수 없습니다 | page0127' };
  }

  const name = toDisplayName(profile);
  const title = `${book.title} | ${name}님의 책장`;
  // 사용자가 쓴 문장이 있으면 그게 이 기록의 요약이다
  const description =
    book.one_line_review?.trim() ||
    `${name}님이 읽은 ${book.title}${book.author ? ` (${book.author})` : ''}`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  };
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
