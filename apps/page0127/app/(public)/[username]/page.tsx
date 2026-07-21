import { Suspense } from 'react';

import { notFound } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

import { getBookStats, getOverallStats } from '@/entities/book/server';
import { getProfileByUsername } from '@/entities/profile/api/getProfileByUsername';

import { CalendarBlockError } from '@/widgets/dashboard/CalendarBlockError';
import { CalendarBlockSkeleton } from '@/widgets/dashboard/CalendarBlockSkeleton';
import { CalendarSection } from '@/widgets/dashboard/CalendarSection';
import { PublicLibraryContent } from '@/widgets/public-library/PublicLibraryContent';

import type { Book } from '@/entities/book';
import type { TasteAnalysisSummary } from '@/entities/taste-analysis/types';

type PageProps = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ year?: string }>;
};

/** 책 목록 조회 — 소유자면 전체(공개+보관), 방문자면 공개된 것만 */
const getBooks = async (
  userId: string,
  publicOnly: boolean
): Promise<Book[]> => {
  const supabase = await createClient();

  let query = supabase
    .from('books')
    .select('*')
    .eq('user_id', userId)
    .order('completed_date', { ascending: false });

  if (publicOnly) {
    query = query.eq('is_public', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('책 목록 조회 실패:', error.message);
    return [];
  }

  return data ?? [];
};

/**
 * 서재 페이지 (Server Component)
 *
 * 본인이 보면 소유자 모드(전체 책, 캘린더, 목표, 취향분석 전체 진입, 보관 탭),
 * 남이 보면 방문자 모드(공개된 책만, 읽기 전용)로 같은 화면이 갈린다.
 */
const LibraryPage = async ({ params, searchParams }: PageProps) => {
  const { username } = await params;
  const { year } = await searchParams;

  const supabase = await createClient();
  const currentYear = new Date().getFullYear();
  const isAllView = !year || year === 'all';
  const selectedYear = isAllView ? currentYear : parseInt(year!, 10);

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

  const [allBooks, stats, overallStats, { data: latestAnalysis }] =
    await Promise.all([
      getBooks(profile.id, !isOwnProfile),
      getBookStats(profile.id, isAllView ? null : selectedYear, !isOwnProfile),
      getOverallStats(profile.id, !isOwnProfile),
      supabase
        .from('taste_analyses')
        .select('personality_type')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const bookYears = allBooks
    .map((book) =>
      book.completed_date ? new Date(book.completed_date).getFullYear() : null
    )
    .filter((y): y is number => y !== null);

  const uniqueYears = Array.from(new Set([currentYear, ...bookYears])).sort(
    (a, b) => b - a
  );

  const booksToShow = isAllView
    ? allBooks
    : allBooks.filter((book) => {
        if (!book.completed_date) return false;
        return new Date(book.completed_date).getFullYear() === selectedYear;
      });

  // 소유자 전용 데이터 — 방문자면 아예 조회하지 않는다
  let analyzableBookCount = 0;
  let newBooksSinceLastAnalysis: number | null = null;
  let analysisHistory: TasteAnalysisSummary[] = [];

  if (isOwnProfile) {
    const { count } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('status', 'completed')
      .not('rating', 'is', null);
    analyzableBookCount = count ?? 0;

    const { data: history } = await supabase
      .from('taste_analyses')
      .select('id, personality_type, created_at, analyzed_books_count')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10);
    analysisHistory = history ?? [];

    const lastAnalysis = analysisHistory[0] ?? null;
    if (lastAnalysis) {
      const { count: newCount } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('status', 'completed')
        .not('rating', 'is', null)
        .gt('completed_date', lastAnalysis.created_at);
      newBooksSinceLastAnalysis = newCount ?? 0;
    }
  }

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
      analyzableBookCount={analyzableBookCount}
      newBooksSinceLastAnalysis={newBooksSinceLastAnalysis}
      analysisHistory={analysisHistory}
      calendarSlot={
        isOwnProfile ? (
          <ErrorBoundary fallback={<CalendarBlockError />}>
            <Suspense fallback={<CalendarBlockSkeleton />}>
              <CalendarSection userId={profile.id} />
            </Suspense>
          </ErrorBoundary>
        ) : undefined
      }
    />
  );
};

export default LibraryPage;
