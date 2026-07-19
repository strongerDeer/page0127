import { notFound } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';

import { getBookStats, getOverallStats } from '@/entities/book/server';
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
    // 내 서재와 동일하게 완독일 기준으로 정렬한다 (연도 분류도 completed_date 기준)
    .order('completed_date', { ascending: false });

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
  const currentYear = new Date().getFullYear();
  // selectedYear는 searchParams와 currentYear에만 의존 → 미리 계산 (stats 병렬화에 필요)
  const selectedYear = year ? parseInt(year, 10) : currentYear;

  // 1. 프로필 조회와 현재 사용자 확인은 서로 독립 → 병렬
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

  const isOwnProfile = currentUser?.id === profile.id;

  // 2. 공개된 책 목록과 연도별 통계는 profile.id에만 의존 → 병렬
  const [allBooks, stats, overallStats] = await Promise.all([
    getPublicBooks(profile.id),
    getBookStats(profile.id, selectedYear),
    getOverallStats(profile.id),
  ]);

  // 3. 사용 가능한 연도 목록 생성 (완독일 기준 — 내 서재와 동일)
  const bookYears = allBooks
    .map((book) =>
      book.completed_date ? new Date(book.completed_date).getFullYear() : null
    )
    .filter((year): year is number => year !== null);

  const uniqueYears = Array.from(new Set([currentYear, ...bookYears])).sort(
    (a, b) => b - a
  );

  // 4. 선택된 연도의 책만 필터링 (완독일 기준)
  const booksInYear = allBooks.filter((book) => {
    if (!book.completed_date) return false;
    return new Date(book.completed_date).getFullYear() === selectedYear;
  });

  return (
    <PublicLibraryContent
      profile={profile}
      username={username}
      isOwnProfile={isOwnProfile}
      currentUserId={currentUser?.id}
      books={booksInYear}
      stats={stats}
      yearlyReading={overallStats.yearlyTrend}
      availableYears={uniqueYears}
      selectedYear={selectedYear}
    />
  );
};

export default PublicLibraryPage;
