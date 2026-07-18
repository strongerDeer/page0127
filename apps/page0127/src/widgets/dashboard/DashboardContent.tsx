'use client';

import { useCallback, useState, useTransition } from 'react';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import { Link2 } from 'lucide-react';
import { toast } from 'sonner';

import { apiClient } from '@/shared/api/client';
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { PageContainer } from '@/shared/ui/PageContainer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';

import { ReadingGoalDialog } from '@/features/profile/ui/ReadingGoalDialog';
import { useLibraryFilters } from '@/features/stats/model/useLibraryFilters';
import { DashboardBookList } from '@/features/stats/ui/DashboardBookList';
import { ReadingProgressOverview } from '@/features/stats/ui/ReadingProgressOverview';

import { PublicBookShelf } from '@/widgets/book/ui/PublicBookShelf';
import { ReadingJourneyCard } from '@/widgets/dashboard/ReadingJourneyCard';

// Recharts는 브라우저 measure가 필요한 클라이언트 전용 라이브러리
// → next/dynamic + ssr:false 로 분리해서 초기 번들에서 제외
const DashboardCharts = dynamic(
  () =>
    import('@/features/stats/ui/DashboardCharts').then(
      (m) => m.DashboardCharts
    ),
  {
    ssr: false,
    loading: () => (
      <div className='h-[700px] animate-pulse rounded-lg bg-muted' />
    ),
  }
);

import type { Book } from '@/entities/book';
import type { BookStats, OverallStats } from '@/entities/book';
import type { Profile } from '@/entities/profile/types';

type DashboardContentProps = {
  /** 전체 독서 통계 (연도 무관) */
  overallStats: OverallStats;

  /** 통계 데이터 */
  stats: BookStats;

  /** 완독한 책 목록 */
  books: Book[];

  /** 사용자 이메일 */
  userEmail: string;

  /** 사용 가능한 연도 목록 */
  availableYears: number[];

  /** 현재 선택된 연도 */
  selectedYear: number;

  /** 사용자 프로필 */
  profile: Profile | null;

  /** 현재 연도 */
  currentYear: number;

  /** Calendar 영역 슬롯 — page.tsx에서 <Suspense>로 감싸 주입 */
  calendarSlot: React.ReactNode;
};

/**
 * 대시보드 컨텐츠 (Client Component)
 *
 * 학습 포인트:
 * - Server Component에서 데이터를 받아 Client Component에서 상태 관리
 * - 월별 + 카테고리 복합 필터 상태 관리
 * - Lift State Up 패턴: 자식 컴포넌트들의 상태를 부모에서 관리
 * - 필터 상태를 차트와 책 목록이 공유
 *
 * @example
 * <DashboardContent
 *   stats={stats}
 *   books={books}
 *   userEmail={user.email}
 *   userId={user.id}
 * />
 */
export const DashboardContent = ({
  overallStats,
  stats,
  books,
  userEmail: _userEmail,
  availableYears,
  selectedYear,
  profile,
  currentYear,
  calendarSlot,
}: DashboardContentProps) => {
  const router = useRouter();

  // ─── 필터 상태 — 공개 서재와 공유하는 훅 (features/stats/model/useLibraryFilters)
  const filters = useLibraryFilters();
  const {
    selectedMonth,
    selectedCategories,
    selectedRating,
    searchQuery,
    statusFilter,
  } = filters;

  // 단순 boolean은 useState가 적합 — useReducer는 복합 상태에 써야 의미 있음
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);

  // ReadingGoalDialog의 useEffect deps에 들어가므로 참조를 안정화 (useCallback)
  const handleGoalClose = useCallback(() => setIsGoalDialogOpen(false), []);
  const handleGoalSuccess = useCallback(() => router.refresh(), [router]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzeDialogOpen, setIsAnalyzeDialogOpen] = useState(false);

  // 차트 클릭 시 필터 dispatch를 직접 호출 → useTransition 적합
  // 월/평점 필터 변경은 급하지 않음 — 입력 응답성을 해치지 않도록 우선순위 낮춤
  const [isFilterPending, startFilterTransition] = useTransition();

  // 독서 목표 데이터
  const readingGoal = profile?.reading_goal;
  const goalTarget =
    readingGoal?.year === selectedYear ? readingGoal.target : stats.yearlyGoal;

  // 월 필터 클릭 핸들러 (토글 방식: 같은 월 클릭 시 필터 해제)
  // startFilterTransition: 차트 클릭 → 목록 필터링은 급하지 않음 → 우선순위 낮춤
  const handleMonthClick = (month: number) =>
    startFilterTransition(() => filters.toggleMonth(month));

  // 월 필터 제거 핸들러
  const handleRemoveMonthFilter = filters.clearMonth;

  // 평점 필터 클릭 핸들러 (토글 방식)
  const handleRatingClick = (rating: number) =>
    startFilterTransition(() => filters.toggleRating(rating));

  // 평점 필터 제거 핸들러
  const handleRemoveRatingFilter = filters.clearRating;

  // 참조 안정화는 훅이 보장한다 (useLibraryFilters의 useMemo 액션)
  const handleSearchChange = filters.setSearch;

  // 연도 변경 핸들러
  const handleYearChange = (value: string) => {
    router.push(`/dashboard?year=${value}`);
  };

  // 공개 서재 URL 복사
  const handleCopyPublicUrl = () => {
    if (!profile?.username) return;

    const publicUrl = `${window.location.origin}/${profile.username}`;
    navigator.clipboard.writeText(publicUrl);
    toast.success('공개 서재 URL이 복사되었습니다!');
  };

  // AI 취향 분석 — 최소 조건 확인 후 확인 다이얼로그 오픈
  const handleAnalyzeTaste = () => {
    const completedBooks = books.filter(
      (book) => book.status === 'completed' && book.rating !== null
    );

    if (completedBooks.length < 5) {
      toast.error(
        '취향 분석을 위해 최소 5권의 완독한 책(별점 포함)이 필요합니다.'
      );
      return;
    }

    setIsAnalyzeDialogOpen(true);
  };

  // 다이얼로그 확인 후 실제 분석 실행
  const doAnalyzeTaste = async () => {
    setIsAnalyzing(true);

    try {
      await apiClient.post('/taste-analysis/analyze');

      toast.success('취향 분석이 완료되었습니다!');
      router.push('/dashboard/taste-analysis');
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, '취향 분석 중 오류가 발생했습니다.')
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    // PageContainer: 레이아웃 껍데기를 분리해 PublicLibraryContent와 공유
    <PageContainer width='wide' className='space-y-10'>
      {/* Header */}
      <header className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='heading-1 text-text-strong'>내 서재</h1>
          <p className='mt-2 text-sm text-text-subtle'>
            {profile?.nickname
              ? `${profile.nickname}님의 책과 기록을 한곳에 모았어요.`
              : '책과 기록을 한곳에 모았어요.'}
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-3'>
          {/* Year Select */}
          <Select
            value={selectedYear.toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className='w-[140px] bg-card shadow-none'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleAnalyzeTaste} disabled={isAnalyzing}>
            {isAnalyzing ? '분석 중…' : '취향 분석'}
          </Button>

          {profile?.username && (
            <Button
              variant='outline'
              size='icon'
              className='shadow-none'
              onClick={handleCopyPublicUrl}
              title='공개 서재 주소 복사'
            >
              <span className='sr-only'>공개 서재 주소 복사</span>
              <Link2 className='h-4 w-4' />
            </Button>
          )}
        </div>
      </header>

      {/* 서재의 주인공은 책: 카드 면 없이 가로선 사이에 바로 배치한다. */}
      <section
        className='py-6'
        style={{
          opacity: isFilterPending ? 0.6 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        <DashboardBookList
          title='최근 읽은 책'
          books={books}
          categories={stats.categoryReading}
          selectedMonth={selectedMonth}
          selectedCategories={selectedCategories}
          selectedRating={selectedRating}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onCategoriesChange={filters.setCategories}
          onRemoveMonthFilter={handleRemoveMonthFilter}
          onRemoveRatingFilter={handleRemoveRatingFilter}
          onSearchChange={handleSearchChange}
          onStatusChange={filters.setStatus}
          onResetAll={filters.resetAll}
          renderBooks={(filteredBooks) => (
            <PublicBookShelf books={filteredBooks} compact />
          )}
        />
      </section>

      <ReadingProgressOverview
        year={selectedYear}
        completed={stats.totalCompletedBooks}
        target={goalTarget}
        totalPages={stats.totalPages}
        averageRating={stats.averageRating}
        favoriteBooks={stats.fiveStarBooks}
        books={books}
        onSetGoal={
          selectedYear === currentYear
            ? () => setIsGoalDialogOpen(true)
            : undefined
        }
      />

      {/* Main Grid Section */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Left Column (Hero / Charts) - Spans 2 cols */}
        <div className='space-y-6 lg:col-span-2'>
          <DashboardCharts
            monthlyReading={stats.monthlyReading}
            yearlyReading={overallStats.yearlyTrend}
            categoryReading={stats.categoryReading}
            ratingReading={stats.ratingReading}
            averageRating={stats.averageRating}
            onMonthClick={handleMonthClick}
            onRatingClick={handleRatingClick}
          />
        </div>

        {/* Right Column (Side Widgets) */}
        <div className='space-y-6'>
          {/* Reading Journey (All Time) */}
          <Card className='rounded-2xl bg-card py-6 shadow-none'>
            <CardHeader>
              <CardTitle>지금까지의 기록</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <ReadingJourneyCard data={overallStats.journey} />
            </CardContent>
          </Card>

          {/* 누적 기록 다음에 월별 독서 흐름을 바로 확인한다. */}
          {calendarSlot}
        </div>
      </div>

      <ReadingGoalDialog
        isOpen={isGoalDialogOpen}
        onClose={handleGoalClose}
        currentYear={currentYear}
        currentGoal={readingGoal ?? null}
        onSuccess={handleGoalSuccess}
      />

      <AlertDialog
        open={isAnalyzeDialogOpen}
        onOpenChange={setIsAnalyzeDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>AI 독서 취향 분석</AlertDialogTitle>
            <AlertDialogDescription>
              분석에 약 30초 정도 소요됩니다. 시작하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={doAnalyzeTaste}>시작</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
};
