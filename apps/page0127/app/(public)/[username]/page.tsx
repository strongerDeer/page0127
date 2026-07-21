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
  // 뷰 모드: 'all'(전체 누적) 또는 특정 연도 — 내 서재(대시보드)와 동일한 규칙.
  const isAllView = !year || year === 'all';
  const selectedYear = isAllView ? currentYear : parseInt(year!, 10);

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

  // 2. 책 목록·연도 통계·전체 통계는 profile.id에만 의존 → 병렬.
  //    통계는 publicOnly=true — 공개된 책만 집계해 책장 숫자와 일치시킨다.
  //    전체 뷰면 연도 통계도 전체 기준(year=null)으로 집계한다.
  //    취향 분석은 자세한 내용 없이 최신 성향 타입 이름만 배지로 노출한다.
  const [allBooks, stats, overallStats, { data: latestAnalysis }] =
    await Promise.all([
      getPublicBooks(profile.id),
      getBookStats(profile.id, isAllView ? null : selectedYear, true),
      getOverallStats(profile.id, true),
      supabase
        .from('taste_analyses')
        .select('personality_type')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
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

  // 4. 전체 뷰는 공개된 책 전부, 연도 뷰는 그 해 완독분만 (완독일 기준)
  const booksToShow = isAllView
    ? allBooks
    : allBooks.filter((book) => {
        if (!book.completed_date) return false;
        return new Date(book.completed_date).getFullYear() === selectedYear;
      });

  return (
    <PublicLibraryContent
      profile={profile}
      username={username}
      isOwnProfile={isOwnProfile}
      currentUserId={currentUser?.id}
      books={booksToShow}
      stats={stats}
      overallStats={overallStats}
      availableYears={uniqueYears}
      selectedYear={selectedYear}
      isAllView={isAllView}
      currentYear={currentYear}
      personalityType={latestAnalysis?.personality_type ?? null}
    />
  );
};

export default PublicLibraryPage;
