import { createClient } from '@/shared/config/supabase/server';

import { getBookStats } from '@/entities/book/api/getBookStats';
import { getAvailableYears, getMyBooks } from '@/entities/book/api/getMyBooks';

import { DashboardContent } from '@/features/stats/ui/DashboardContent';

/**
 * 대시보드 페이지 (Server Component)
 *
 * 학습 포인트:
 * - Server Component에서 데이터 페칭
 * - 데이터를 Client Component로 전달
 * - Server/Client Component 분리 패턴
 * - URL 쿼리 파라미터로 연도 필터링
 * - (protected) layout.tsx에서 인증 체크하므로 여기서는 불필요
 */
const DashboardPage = async (props: {
  searchParams: Promise<{ year?: string }>;
}) => {
  const supabase = await createClient();
  const searchParams = await props.searchParams;

  // 현재 로그인한 사용자 정보 조회
  // layout.tsx에서 이미 인증 체크했으므로 user는 항상 존재
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 사용 가능한 연도 목록 조회
  const availableYears = await getAvailableYears(user!.id);

  // URL에서 연도 파라미터 추출 (기본값: 현재 연도)
  const currentYear = new Date().getFullYear();
  const selectedYear = searchParams.year
    ? parseInt(searchParams.year, 10)
    : availableYears.includes(currentYear)
      ? currentYear
      : (availableYears[0] ?? currentYear); // 현재 연도에 데이터가 없으면 최신 연도, 데이터가 없으면 현재 연도

  // 통계 데이터 조회 (연도 필터 적용)
  const stats = await getBookStats(user!.id, selectedYear);

  // 완독한 책 목록 조회 (연도 필터 적용)
  const books = await getMyBooks(user!.id, selectedYear);

  return (
    <DashboardContent
      stats={stats}
      books={books}
      userEmail={user!.email!}
      userId={user!.id}
      availableYears={availableYears}
      selectedYear={selectedYear}
    />
  );
};

export default DashboardPage;
