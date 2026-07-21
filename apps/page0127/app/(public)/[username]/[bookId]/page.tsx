import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';
import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/PageContainer';

import { getProfileByUsername } from '@/entities/profile/api/getProfileByUsername';

import { BookDetailContent } from '@/widgets/book/ui/BookDetailContent';

type PageProps = {
  params: Promise<{ username: string; bookId: string }>;
};

/**
 * 공개 책 상세 페이지 (Server Component)
 *
 * 방문자가 공개 서재에서 책을 눌렀을 때 보는 화면.
 * - 해당 username 소유이면서 is_public=true 인 책만 조회 → 아니면 404
 * - 표시 본문은 내 서재 상세와 동일한 BookDetailContent 공유
 * - isOwner=false: 나만의 메모·공개여부 배지는 감춘다 (전시 뷰)
 */
const PublicBookDetailPage = async ({ params }: PageProps) => {
  const { username, bookId } = await params;

  const profile = await getProfileByUsername(username);
  if (!profile) {
    notFound();
  }

  const supabase = await createClient();

  // 소유자·공개 여부를 쿼리 조건으로 강제 — 비공개 책이나 남의 책은 애초에 안 나온다
  const { data: book } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .single();

  if (!book) {
    notFound();
  }

  return (
    <PageContainer width='content'>
      <div className='mb-6'>
        <Link href={`/${username}`}>
          <Button variant='outline'>← {username}님의 서재로</Button>
        </Link>
      </div>

      <BookDetailContent book={book} />
    </PageContainer>
  );
};

export default PublicBookDetailPage;
