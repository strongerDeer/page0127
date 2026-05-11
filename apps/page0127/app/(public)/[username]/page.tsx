import { notFound } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

import { getBookStats } from '@/entities/book/server';
import { getProfileByUsername } from '@/entities/profile/api/getProfileByUsername';

import { PublicLibraryContent } from '@/widgets/public-library/PublicLibraryContent';

import type { Book } from '@/entities/book';

type PageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ year?: string }>;
};

/**
 * 공개된 책 목록 조회 (is_public = true)
 */
const getPublicBooks = async (userId: string): Promise<Book[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false});

  if (error) {
    console.error('책 목록 조회 실패:', error.message);
    return [];
  }

  return data ?? [];
};

/**
 * 공개 서재 페이지
 *
 * 학습 포인트:
 * - Dashboard와 동일한 구조
 * - 년도별 통계 표시
 * - 공개된 책만 조회 (is_public = true)
 */
const PublicLibraryPage = async ({ params, searchParams }: PageProps) => {
  const { username } = await params;
  const { year } = await searchParams;

  const supabase = await createClient();

  // 1. username으로 프로필 조회
  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  // 2. 현재 로그인한 사용자 확인
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  const isOwnProfile = currentUser?.id === profile.id;

  // 3. 공개된 책 목록 조회
  const allBooks = await getPublicBooks(profile.id);

  // 4. 사용 가능한 연도 목록 생성
  const currentYear = new Date().getFullYear();
  const bookYears = allBooks
    .map((book) =>
      book.created_at ? new Date(book.created_at).getFullYear() : null,
    )
    .filter((year): year is number => year !== null);

  const uniqueYears = Array.from(new Set([currentYear, ...bookYears])).sort(
    (a, b) => b - a,
  );

  // 5. 선택된 연도 (기본값: 현재 연도)
  const selectedYear = year ? parseInt(year, 10) : currentYear;

  // 6. 선택된 연도의 책만 필터링
  const booksInYear = allBooks.filter((book) => {
    if (!book.created_at) return false;
    return new Date(book.created_at).getFullYear() === selectedYear;
  });

  // 7. 통계 계산
  const stats = await getBookStats(profile.id, selectedYear);

  return (
    <PublicLibraryContent
      profile={profile}
      username={username}
      isOwnProfile={isOwnProfile}
      currentUserId={currentUser?.id}
      books={booksInYear}
      stats={stats}
      availableYears={uniqueYears}
      selectedYear={selectedYear}
    />
  );
};

export default PublicLibraryPage;
