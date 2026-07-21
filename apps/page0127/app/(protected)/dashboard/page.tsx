import { Suspense } from 'react';

import { createClient } from '@/shared/config/supabase/server';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';

import {
  getAvailableYears,
  getBookStats,
  getOverallStats,
} from '@/entities/book/server';
import { getProfile, upsertProfile } from '@/entities/profile/api/getProfile';

import { CalendarBlockError } from '@/widgets/dashboard/CalendarBlockError';
import { CalendarBlockSkeleton } from '@/widgets/dashboard/CalendarBlockSkeleton';
import { CalendarSection } from '@/widgets/dashboard/CalendarSection';
import { DashboardContent } from '@/widgets/dashboard/DashboardContent';

/**
 * 대시보드 페이지 (Server Component)
 *
 * 학습 포인트:
 * - Server Component에서 데이터 페칭
 * - URL 쿼리 파라미터로 연도 필터링
 * - Calendar 영역은 <Suspense>로 분리 → 페이지 본체보다 늦게 도착해도 됨
 * - (protected) layout.tsx에서 인증 체크하므로 여기서는 불필요
 */
const DashboardPage = async (props: {
  searchParams: Promise<{ year?: string }>;
}) => {
  const supabase = await createClient();
  const searchParams = await props.searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const availableYears = await getAvailableYears(user!.id);

  const currentYear = new Date().getFullYear();
  // 뷰 모드: 'all'(전체 누적) 또는 특정 연도.
  // 기본은 '전체' — 누적을 먼저 보여주고 연도 탭으로 좁혀 들어가는 흐름.
  const isAllView = !searchParams.year || searchParams.year === 'all';
  const selectedYear = isAllView
    ? currentYear // 전체 뷰에서도 목표/그래프 기준 연도로 올해를 쓴다
    : parseInt(searchParams.year!, 10);

  // profile은 없으면 생성 후 재조회해야 하므로 헬퍼로 감싼다 (Promise.all에 넣기 위함)
  const ensureProfile = async () => {
    let p = await getProfile(user!.id);
    if (!p) {
      await upsertProfile(user!.id, user!.email!);
      p = await getProfile(user!.id);
    }
    return p;
  };

  // 서재 목록 쿼리 — 전체 뷰는 완독 전체, 연도 뷰는 그 해 completed_date만.
  // (체이닝 중간에 조건을 끼우기 위해 쿼리를 먼저 변수로 만든다)
  let booksQuery = supabase
    .from('books')
    .select('*')
    .eq('user_id', user!.id)
    .eq('status', 'completed')
    .order('completed_date', { ascending: false })
    // 전체 뷰는 서재 전권을 싣되 과도한 로딩을 막는 안전 상한
    .limit(1000);

  if (!isAllView) {
    booksQuery = booksQuery
      .gte('completed_date', `${selectedYear}-01-01`)
      .lte('completed_date', `${selectedYear}-12-31`);
  }

  // 서로 독립적인 4개 데이터를 병렬로 페치 → 직렬 await(waterfall) 제거
  // 전체 뷰면 연도 통계도 전체 기준(year=null)으로 집계한다.
  const [profile, overallStats, stats, allBooksResult] = await Promise.all([
    ensureProfile(),
    getOverallStats(user!.id),
    getBookStats(user!.id, isAllView ? null : selectedYear),
    booksQuery,
  ]);

  const books = allBooksResult.data ?? [];

  // 취향 분석 게이트는 "선택 연도"가 아니라 "전체 기록" 기준이어야 한다.
  // (books는 위에서 연도 필터가 걸려 있으므로 여기 카운트에 쓰면 안 됨)
  // 완독 + 별점 있는 책이 전체에서 몇 권인지 별도로 조회한다.
  const { count: analyzableBookCount } = await supabase
    .from('books')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)
    .eq('status', 'completed')
    .not('rating', 'is', null);

  // 취향 분석 기록 카드용 — 최근 10개까지 요약 정보만 조회
  // (같은 쿼리 결과를 재분석 게이트 계산에도 재사용한다)
  const { data: analysisHistory } = await supabase
    .from('taste_analyses')
    .select('id, personality_type, created_at, analyzed_books_count')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // 재분석 게이트 — 마지막 분석 이후 새로 쌓인 책 수를 계산한다.
  // 분석 기록이 없으면 null (이 경우 위의 analyzableBookCount 기준 게이트만 적용)
  const lastAnalysis = analysisHistory?.[0] ?? null;

  let newBooksSinceLastAnalysis: number | null = null;
  if (lastAnalysis) {
    const { count } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .eq('status', 'completed')
      .not('rating', 'is', null)
      .gt('completed_date', lastAnalysis.created_at);
    newBooksSinceLastAnalysis = count ?? 0;
  }

  return (
    <DashboardContent
      overallStats={overallStats}
      stats={stats}
      books={books}
      analyzableBookCount={analyzableBookCount ?? 0}
      newBooksSinceLastAnalysis={newBooksSinceLastAnalysis}
      analysisHistory={analysisHistory ?? []}
      userEmail={user!.email!}
      availableYears={availableYears}
      selectedYear={selectedYear}
      isAllView={isAllView}
      profile={profile}
      currentYear={currentYear}
      // Calendar 영역은 외부에서 주입 (ErrorBoundary > Suspense로 감싸 별도 스트리밍)
      // 캘린더만 실패해도 대시보드 본체(통계·차트)는 그대로 유지된다
      calendarSlot={
        <ErrorBoundary fallback={<CalendarBlockError />}>
          <Suspense fallback={<CalendarBlockSkeleton />}>
            <CalendarSection userId={user!.id} />
          </Suspense>
        </ErrorBoundary>
      }
    />
  );
};

export default DashboardPage;
