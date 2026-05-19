import { Suspense } from 'react';

import { createClient } from '@/shared/config/supabase/server';

import {
  getAvailableYears,
  getBookStats,
  getOverallStats,
} from '@/entities/book/server';
import { getProfile, upsertProfile } from '@/entities/profile/api/getProfile';

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

  let profile = await getProfile(user!.id);
  if (!profile) {
    await upsertProfile(user!.id, user!.email!);
    profile = await getProfile(user!.id);
  }

  const overallStats = await getOverallStats(user!.id);
  const stats = await getBookStats(user!.id, selectedYear);

  const { data: allBooks } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  const books = allBooks ?? [];

  return (
    <DashboardContent
      overallStats={overallStats}
      stats={stats}
      books={books}
      userEmail={user!.email!}
      userId={user!.id}
      availableYears={availableYears}
      selectedYear={selectedYear}
      profile={profile}
      currentYear={currentYear}
      // Calendar 영역은 외부에서 주입 (Suspense로 감싸 별도 스트리밍)
      calendarSlot={
        <Suspense fallback={<CalendarBlockSkeleton />}>
          <CalendarSection userId={user!.id} />
        </Suspense>
      }
    />
  );
};

export default DashboardPage;
