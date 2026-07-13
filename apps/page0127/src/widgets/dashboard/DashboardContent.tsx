'use client';

import { useCallback, useReducer, useState, useTransition } from 'react';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import { BookOpen, CheckCircle, FileText, Link2, Target } from 'lucide-react';
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
import { StatCard } from '@/shared/ui/StatCard';

import { ReadingGoalDialog } from '@/features/profile/ui/ReadingGoalDialog';
import { DashboardBookList } from '@/features/stats/ui/DashboardBookList';
import { ReadingGoalProgress } from '@/features/stats/ui/ReadingGoalProgress';

import { ReadingJourneyCard } from '@/widgets/dashboard/ReadingJourneyCard';
import { PublicBookShelf } from '@/widgets/public-library/PublicBookShelf';

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

const YearlyTrendChart = dynamic(
  () =>
    import('@/widgets/dashboard/YearlyTrendChart').then(
      (m) => m.YearlyTrendChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className='h-[300px] animate-pulse rounded-lg bg-muted' />
    ),
  }
);

import type { Book, BookStatus } from '@/entities/book';
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

// ─── 필터 상태 ─────────────────────────────────────────────────────
// 컴포넌트 외부에 정의: 렌더링마다 재생성되지 않음
type FilterState = {
  selectedMonth: number | null;
  selectedCategory: string | null;
  selectedRating: number | null;
  searchQuery: string;
  // statusFilter를 여기서 관리하는 이유:
  //   DashboardBookList 내부 useState로 두면 RESET_ALL이 닿지 않음
  //   부모 reducer로 올려야(lift state up) 전체 초기화 가능
  statusFilter: BookStatus | 'all';
};

type FilterAction =
  | { type: 'TOGGLE_MONTH'; month: number }
  | { type: 'CLEAR_MONTH' }
  | { type: 'TOGGLE_RATING'; rating: number }
  | { type: 'CLEAR_RATING' }
  | { type: 'SET_CATEGORY'; category: string | null }
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'SET_STATUS'; status: BookStatus | 'all' }
  | { type: 'RESET_ALL' };

// 초기값을 상수로 분리:
//   1. useReducer 두 번째 인자로 재사용
//   2. RESET_ALL 케이스에서 같은 값 참조 → "진짜 초기 상태"로 돌아감
const INITIAL_FILTER_STATE: FilterState = {
  selectedMonth: null,
  selectedCategory: null,
  selectedRating: null,
  searchQuery: '',
  statusFilter: 'all',
};

const filterReducer = (
  state: FilterState,
  action: FilterAction
): FilterState => {
  switch (action.type) {
    case 'TOGGLE_MONTH':
      return {
        ...state,
        selectedMonth:
          state.selectedMonth === action.month ? null : action.month,
      };
    case 'CLEAR_MONTH':
      return { ...state, selectedMonth: null };
    case 'TOGGLE_RATING':
      return {
        ...state,
        selectedRating:
          state.selectedRating === action.rating ? null : action.rating,
      };
    case 'CLEAR_RATING':
      return { ...state, selectedRating: null };
    case 'SET_CATEGORY':
      return { ...state, selectedCategory: action.category };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query };
    case 'SET_STATUS':
      return { ...state, statusFilter: action.status };
    case 'RESET_ALL':
      // 한 번의 dispatch로 5개 필터 동시 초기화 (statusFilter 포함)
      return INITIAL_FILTER_STATE;
    default:
      return state;
  }
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

  // ─── 필터 상태 (month/category/rating/search) ─────────────────────
  // useReducer를 쓰는 이유:
  //   - 4개의 필터가 논리적으로 하나의 그룹 → 한 객체로 관리
  //   - RESET_FILTERS 같은 액션으로 한 번에 전체 초기화 가능
  const [filterState, filterDispatch] = useReducer(
    filterReducer,
    INITIAL_FILTER_STATE
  );

  const {
    selectedMonth,
    selectedCategory,
    selectedRating,
    searchQuery,
    statusFilter,
  } = filterState;

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
  const isCurrentYearGoal = readingGoal?.year === selectedYear;

  // useMemo 불필요: 조건 하나짜리 filter라 계산이 매우 빠르고,
  // 개인 독서 데이터는 수십 권 수준이라 캐싱 이득이 없다
  const completedBooksInYear = books.filter(
    (book) =>
      book.status === 'completed' &&
      book.completed_date &&
      new Date(book.completed_date).getFullYear() === selectedYear
  ).length;

  // 월 필터 클릭 핸들러 (토글 방식: 같은 월 클릭 시 필터 해제)
  // startFilterTransition: 차트 클릭 → 목록 필터링은 급하지 않음 → 우선순위 낮춤
  const handleMonthClick = (month: number) =>
    startFilterTransition(() =>
      filterDispatch({ type: 'TOGGLE_MONTH', month })
    );

  // 월 필터 제거 핸들러
  const handleRemoveMonthFilter = () => filterDispatch({ type: 'CLEAR_MONTH' });

  // 평점 필터 클릭 핸들러 (토글 방식)
  const handleRatingClick = (rating: number) =>
    startFilterTransition(() =>
      filterDispatch({ type: 'TOGGLE_RATING', rating })
    );

  // 평점 필터 제거 핸들러
  const handleRemoveRatingFilter = () =>
    filterDispatch({ type: 'CLEAR_RATING' });

  // DashboardBookList → BookSearchInput의 useEffect deps에 들어가므로 참조를 안정화
  // (인라인 함수를 그대로 넘기면 매 렌더마다 새 참조가 생겨 effect가 불필요하게 재실행됨)
  const handleSearchChange = useCallback(
    (query: string) => filterDispatch({ type: 'SET_SEARCH', query }),
    []
  );

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
    <PageContainer width='wide' className='space-y-8'>
      {/* Header */}
      <header className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='heading-1 text-text-strong'>내 서재</h1>
        </div>

        <div className='flex items-center gap-4'>
          {/* Year Select */}
          <Select
            value={selectedYear.toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className='w-[140px]'>
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
              onClick={handleCopyPublicUrl}
              title='공개 서재 주소 복사'
            >
              <span className='sr-only'>공개 서재 주소 복사</span>
              <Link2 className='h-4 w-4' />
            </Button>
          )}
        </div>
      </header>

      {/* 요약 지표 */}
      <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
        <StatCard
          icon={<BookOpen className='h-5 w-5' />}
          title='완독'
          value={stats.totalCompletedBooks}
          unit='권'
          variant='blue'
        />
        <StatCard
          icon={<FileText className='h-5 w-5' />}
          title='읽은 쪽수'
          value={stats.totalPages}
          unit='쪽'
          variant='purple'
        />
        <StatCard
          icon={<Target className='h-5 w-5' />}
          title='올해 목표'
          value={stats.yearlyGoal}
          unit='권'
          variant='emerald'
        />
        <StatCard
          icon={<CheckCircle className='h-5 w-5' />}
          title='달성률'
          value={stats.completionRate}
          unit='%'
          variant='rose'
        />
      </div>

      {/* Main Grid Section */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Left Column (Hero / Charts) - Spans 2 cols */}
        <div className='space-y-6 lg:col-span-2'>
          {/* Yearly Trend Chart */}
          <Card className='shadow-none'>
            <CardHeader>
              <CardTitle>연도별 독서 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <YearlyTrendChart data={overallStats.yearlyTrend} />
            </CardContent>
          </Card>

          {/* Monthly & Category Charts */}
          <DashboardCharts
            monthlyReading={stats.monthlyReading}
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
          <Card className='shadow-none'>
            <CardHeader>
              <CardTitle>지금까지의 기록</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <ReadingJourneyCard data={overallStats.journey} />
            </CardContent>
          </Card>

          {/* Reading Goal Progress */}
          <div className='rounded-lg border border-border bg-card p-6'>
            <h3 className='mb-4 heading-2 text-text-strong'>목표 달성률</h3>
            <ReadingGoalProgress
              year={selectedYear}
              target={isCurrentYearGoal && readingGoal ? readingGoal.target : 0}
              current={completedBooksInYear}
              onSetGoal={() => setIsGoalDialogOpen(true)}
            />
          </div>

          {/* 취향 분석 유도 — 화면당 채워진 액센트 블록은 여기 하나뿐 */}
          <div className='rounded-lg bg-primary p-6 text-primary-foreground'>
            <h3 className='heading-2'>나도 몰랐던 내 취향</h3>
            <p className='mt-2 text-sm text-primary-foreground/85'>
              완독한 책 다섯 권이면 충분해요. 책장을 찬찬히 읽고 다음 책까지
              골라 드립니다.
            </p>
            <Button
              variant='secondary'
              className='mt-4 w-full'
              onClick={handleAnalyzeTaste}
            >
              분석 시작
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Calendar & Detail List */}
      <div className='space-y-6'>
        {/* Calendar — Suspense로 감싸 별도 스트리밍 (page.tsx에서 주입) */}
        {calendarSlot}

        {/* Book List */}
        <div className='rounded-lg border border-border bg-card p-1'>
          <Card className='border-0 bg-transparent shadow-none'>
            <CardHeader>
              {/* isFilterPending: 차트 클릭 후 목록 갱신 중임을 표시 */}
              <CardTitle
                style={{
                  opacity: isFilterPending ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                최근 읽은 책
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardBookList
                books={books}
                categories={stats.categoryReading}
                selectedMonth={selectedMonth}
                selectedCategory={selectedCategory}
                selectedRating={selectedRating}
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onCategoryChange={(category) =>
                  filterDispatch({ type: 'SET_CATEGORY', category })
                }
                onRemoveMonthFilter={handleRemoveMonthFilter}
                onRemoveRatingFilter={handleRemoveRatingFilter}
                onSearchChange={handleSearchChange}
                onStatusChange={(status) =>
                  filterDispatch({ type: 'SET_STATUS', status })
                }
                onResetAll={() => filterDispatch({ type: 'RESET_ALL' })}
                showViewAll
                renderBooks={(filteredBooks) => (
                  <PublicBookShelf books={filteredBooks} />
                )}
              />
            </CardContent>
          </Card>
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
