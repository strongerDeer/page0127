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
  const selectedYear = searchParams.year
    ? parseInt(searchParams.year, 10)
    : availableYears.includes(currentYear)
      ? currentYear
      : (availableYears[0] ?? currentYear);

  // profile은 없으면 생성 후 재조회해야 하므로 헬퍼로 감싼다 (Promise.all에 넣기 위함)
  const ensureProfile = async () => {
    let p = await getProfile(user!.id);
    if (!p) {
      await upsertProfile(user!.id, user!.email!);
      p = await getProfile(user!.id);
    }
    return p;
  };

  // 서재 목록 쿼리 — 선택된 연도(completed_date 기준)로 필터링한다.
  // 체이닝 중간에 조건을 끼우기 위해 쿼리를 먼저 변수로 만든 뒤 gte/lte를 붙인다.
  // (getMyBooks의 연도 필터와 동일한 방식: completed_date가 그 해에 속하는 책만)
  const booksQuery = supabase
    .from('books')
    .select('*')
    .eq('user_id', user!.id)
    .gte('completed_date', `${selectedYear}-01-01`)
    .lte('completed_date', `${selectedYear}-12-31`)
    .order('completed_date', { ascending: false });

  // 서로 독립적인 4개 데이터를 병렬로 페치 → 직렬 await(waterfall) 제거
  // (selectedYear는 위 getAvailableYears 결과에만 의존하므로 여기서 안전)
  const [profile, overallStats, stats, allBooksResult] = await Promise.all([
    ensureProfile(),
    getOverallStats(user!.id),
    getBookStats(user!.id, selectedYear),
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

  return (
    <DashboardContent
      overallStats={overallStats}
      stats={stats}
      books={books}
      analyzableBookCount={analyzableBookCount ?? 0}
      userEmail={user!.email!}
      availableYears={availableYears}
      selectedYear={selectedYear}
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
