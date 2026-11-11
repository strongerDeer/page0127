import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';
import { getCurrentUser } from '@/shared/lib/auth/getCurrentUser';

import { getProfile } from '@/entities/profile/api/getProfile';

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * 직접 등록 책 → 내 서재의 그 책 상세로 보내는 길 (/books/mine/[global_books.id]).
 *
 * 책 정보 페이지(/books/info/[id])는 CDN 에 캐시돼 누가 보는지 모른다. 그래서 등록한 사람에게만
 * 보여야 하는 직접 등록 책은 거기서 404 다(HJ M1 결정, 2026-11-11).
 * 등록한 사람은 전체 도서 목록에서 자기 책을 보게 되는데, 그 링크가 여기로 온다.
 *
 * 로그인 전용 그룹이라 비로그인은 레이아웃이 로그인으로 보낸다.
 */
const MyCatalogBookRedirect = async ({ params }: PageProps) => {
  const { id } = await params;
  const [supabase, user] = await Promise.all([
    createClient(),
    getCurrentUser(),
  ]);
  if (!user) notFound();

  const { data: globalBook } = await supabase
    .from('global_books')
    .select('isbn')
    .eq('id', id)
    .maybeSingle();
  if (!globalBook) notFound();

  // 재독으로 같은 ISBN 이 여러 행일 수 있다 → 최근 기록
  const [{ data: rows }, profile] = await Promise.all([
    supabase
      .from('books')
      .select('id')
      .eq('user_id', user.id)
      .eq('isbn', globalBook.isbn)
      .order('updated_at', { ascending: false })
      .limit(1),
    getProfile(user.id),
  ]);
  const myBookId = rows?.[0]?.id;
  if (!myBookId || !profile?.username) notFound();

  redirect(`/${profile.username}/${myBookId}`);
};

export default MyCatalogBookRedirect;
