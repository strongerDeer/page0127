import { Suspense } from 'react';

import { notFound } from 'next/navigation';

import { createClient } from '@/shared/config/supabase/server';
import { checkUsageLimit } from '@/shared/lib/aiUsage';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

import { getCurrentLibraryYear } from '@/entities/book';
import { getOverallStats } from '@/entities/book/server';
import { getProfileByUsername } from '@/entities/profile/api/getProfileByUsername';

import { CalendarBlockError } from '@/widgets/dashboard/CalendarBlockError';
import { CalendarBlockSkeleton } from '@/widgets/dashboard/CalendarBlockSkeleton';
import { CalendarSection } from '@/widgets/dashboard/CalendarSection';
import { PublicLibraryContent } from '@/widgets/public-library/PublicLibraryContent';

import type { Book } from '@/entities/book';
import type { TasteAnalysisSummary } from '@/entities/taste-analysis/types';

type PageProps = {
  params: Promise<{ username: string }>;
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
const LibraryPage = async ({ params }: PageProps) => {
  const { username } = await params;

  const supabase = await createClient();
  const currentYear = getCurrentLibraryYear();

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

  // 통계는 소유자여도 항상 공개된 책만 집계한다 — 책장(visibleBooks)이
  // 보관된 책을 안 보여주는데 통계 숫자만 보관분까지 세면 서로 어긋나 보인다.
  // (책 목록 자체(allBooks)는 보관 탭에 써야 하니 소유자에게 전체를 내려준다)
  // 연도 탭은 이 전체 목록을 클라이언트에서 즉시 분류한다.
  // 따라서 탭을 바꿀 때 이 Server Component와 DB 쿼리가 다시 실행되지 않는다.
  const [allBooks, overallStats, { data: latestAnalysis }] = await Promise.all([
    getBooks(profile.id, !isOwnProfile),
    getOverallStats(profile.id, true),
    supabase
      .from('taste_analyses')
      .select('personality_type')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // 소유자 전용 데이터 — 방문자면 아예 조회하지 않는다
  let analyzableBookCount = 0;
  let newBooksSinceLastAnalysis: number | null = null;
  let analysisHistory: TasteAnalysisSummary[] = [];
  let tasteAnalysisRemaining = 0;

  if (isOwnProfile && currentUser) {
    const [{ count }, { data: history }, { remaining }] = await Promise.all([
      supabase
        .from('books')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('status', 'completed')
        .not('rating', 'is', null),
      supabase
        .from('taste_analyses')
        .select('id, personality_type, created_at, analyzed_books_count')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10),
      checkUsageLimit(supabase, currentUser.id, 'taste_analysis'),
    ]);

    analyzableBookCount = count ?? 0;
    analysisHistory = history ?? [];
    tasteAnalysisRemaining = remaining;

    const lastAnalysis = analysisHistory[0] ?? null;
    if (lastAnalysis) {
      // 이전에는 completed_date(date)를 created_at(timestamptz)와 직접 비교했다.
      // 타입이 어긋나는 데다, 과거에 읽은 책을 오늘 등록하면 새 기록으로 세지 않았다.
      // analyzed_books_count 는 분석 당시의 "완독 + 별점" 권수라 지금 값과 같은 집합이다.
      // → 총량 차이로 세면 '읽고싶어요로 담아둔 책을 나중에 완독'하는 흐름도 잡힌다.
      //
      // 알려진 한계: 분석 라우트가 프롬프트용으로 100권까지만 세므로(MAX_BOOKS_FOR_PROMPT)
      // 분석 대상이 100권을 넘으면 델타가 과다 계산된다. 사용자를 막는 방향이 아니고
      // 재분석은 월간 사용량 한도로 이미 묶여 있어 그대로 둔다.
      newBooksSinceLastAnalysis = Math.max(
        0,
        analyzableBookCount - lastAnalysis.analyzed_books_count
      );
    }
  }

  return (
    <PublicLibraryContent
      profile={profile}
      username={username}
      isOwnProfile={isOwnProfile}
      currentUserId={currentUser?.id}
      books={allBooks}
      overallStats={overallStats}
      currentYear={currentYear}
      personalityType={latestAnalysis?.personality_type ?? null}
      analyzableBookCount={analyzableBookCount}
      newBooksSinceLastAnalysis={newBooksSinceLastAnalysis}
      analysisHistory={analysisHistory}
      tasteAnalysisRemaining={tasteAnalysisRemaining}
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
