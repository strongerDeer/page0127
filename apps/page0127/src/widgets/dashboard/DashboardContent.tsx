'use client';

import { useReducer, useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCircle, FileText, Target } from 'lucide-react';
import { toast } from 'sonner';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { StatCard } from '@/shared/ui/StatCard';
import { StatsPageLayout } from '@/shared/ui/StatsPageLayout';

import { ReadingGoalDialog } from '@/features/profile/ui/ReadingGoalDialog';
import { DashboardBookList } from '@/features/stats/ui/DashboardBookList';
import { DashboardCharts } from '@/features/stats/ui/DashboardCharts';
import { ReadingGoalProgress } from '@/features/stats/ui/ReadingGoalProgress';

import {
  type CalendarData as ReadingCalendarData,
  ReadingCalendar,
} from '@/widgets/dashboard/ReadingCalendar';
import { ReadingJourneyCard } from '@/widgets/dashboard/ReadingJourneyCard';
import { YearlyTrendChart } from '@/widgets/dashboard/YearlyTrendChart';
import { PublicBookShelf } from '@/widgets/public-library/PublicBookShelf';

import type { Book, BookStatus } from '@/entities/book/types';
import type { BookStats, OverallStats } from '@/entities/book/types/stats';
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

  /** 사용자 ID */
  userId: string;

  /** 사용 가능한 연도 목록 */
  availableYears: number[];

  /** 현재 선택된 연도 */
  selectedYear: number;

  /** 사용자 프로필 */
  profile: Profile | null;

  /** 현재 연도 */
  currentYear: number;

  /** 독서 캘린더 데이터 */
  calendarData: ReadingCalendarData[];

  /** 캘린더 요약 정보 */
  calendarSummary: {
    totalBooks: number;
    totalPages: number;
  };

  /** 캘린더 초기 연도 */
  initialCalendarYear: number;

  /** 캘린더 초기 월 */
  initialCalendarMonth: number;
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

// ─── 캘린더 상태 ──────────────────────────────────────────────────
// useReducer를 쓰는 이유:
//   PREV_MONTH 액션 하나로 year+month 동시 갱신 (원자적)
//   useState 2개라면 month=1일 때 setMonth(12) + setYear(y-1) 두 번 호출 필요
type CalendarState = {
  calendarYear: number;
  calendarMonth: number;
};

type CalendarAction = { type: 'PREV_MONTH' } | { type: 'NEXT_MONTH' };

const calendarReducer = (
  state: CalendarState,
  action: CalendarAction
): CalendarState => {
  switch (action.type) {
    case 'PREV_MONTH':
      if (state.calendarMonth === 1) {
        return { calendarYear: state.calendarYear - 1, calendarMonth: 12 };
      }
      return { ...state, calendarMonth: state.calendarMonth - 1 };
    case 'NEXT_MONTH':
      if (state.calendarMonth === 12) {
        return { calendarYear: state.calendarYear + 1, calendarMonth: 1 };
      }
      return { ...state, calendarMonth: state.calendarMonth + 1 };
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
  userEmail,
  userId,
  availableYears,
  selectedYear,
  profile,
  currentYear,
  calendarData,
  calendarSummary,
  initialCalendarYear,
  initialCalendarMonth,
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

  // ─── 캘린더 상태 (year/month) ──────────────────────────────────────
  // useReducer를 쓰는 이유:
  //   - PREV_MONTH 액션 하나로 year+month 동시 갱신 (원자적)
  //   - useState 2개라면 calendarMonth=1일 때 setMonth(12) + setYear(y-1) 두 번 필요
  const [calendarState, calendarDispatch] = useReducer(calendarReducer, {
    calendarYear: initialCalendarYear,
    calendarMonth: initialCalendarMonth,
  });

  const { calendarYear, calendarMonth } = calendarState;

  // 단순 boolean은 useState가 적합 — useReducer는 복합 상태에 써야 의미 있음
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzeDialogOpen, setIsAnalyzeDialogOpen] = useState(false);

  // 차트 클릭 시 필터 dispatch를 직접 호출 → useTransition 적합
  // 월/평점 필터 변경은 급하지 않음 — 입력 응답성을 해치지 않도록 우선순위 낮춤
  const [isFilterPending, startFilterTransition] = useTransition();

  // 남용 패턴 제거: useEffect + fetch + useState 3개 → useQuery 1개로 교체
  //
  // 기존 문제점:
  //   1. useState(loading) + useState(data) + useState(summary) — 3개 직접 관리
  //   2. useEffect 안에서 fetch — 값 변화가 원인인데 TanStack Query가 처리할 수 있는 패턴
  //   3. 에러를 console.error만으로 처리 — 사용자에게 에러 표시 없음
  //   4. 캐싱 없음 — 같은 달 다시 이동해도 매번 fetch
  //   5. "초기 렌더링이 아닐 때만" 분기 — 복잡한 조건 필요
  //
  // 개선 결과:
  //   - queryKey가 바뀌면 자동 fetch (calendarYear/calendarMonth)
  //   - isLoading / isError 자동 관리
  //   - 같은 달 다시 이동 시 캐시에서 즉시 반환
  //   - initialData로 서버 데이터 활용 → 첫 렌더링 추가 fetch 없음
  const { data: calendarResult, isLoading: calendarLoading } = useQuery({
    queryKey: ['calendar', calendarYear, calendarMonth],
    queryFn: async () => {
      const response = await fetch(
        `/api/books/calendar?year=${calendarYear}&month=${calendarMonth}`
      );
      const result = await response.json();
      if (!result.success) throw new Error('캘린더 데이터 조회 실패');
      return result as {
        data: ReadingCalendarData[];
        summary: { totalBooks: number; totalPages: number };
      };
    },
    // 서버에서 받은 초기 데이터 활용 — 초기 연도/월과 일치하면 추가 fetch 없음
    initialData:
      calendarYear === initialCalendarYear &&
      calendarMonth === initialCalendarMonth
        ? { data: calendarData, summary: calendarSummary }
        : undefined,
  });

  const currentCalendarData = calendarResult?.data ?? [];
  const currentCalendarSummary = calendarResult?.summary ?? {
    totalBooks: 0,
    totalPages: 0,
  };

  // 캘린더 이전/다음 달 이동 → dispatch 한 번으로 year+month 원자적 갱신
  const handlePreviousMonth = () => calendarDispatch({ type: 'PREV_MONTH' });
  const handleNextMonth = () => calendarDispatch({ type: 'NEXT_MONTH' });

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
      const response = await fetch('/api/taste-analysis/analyze', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '분석에 실패했습니다.');
      }

      await response.json();

      toast.success('취향 분석이 완료되었습니다!');
      router.push('/dashboard/taste-analysis');
    } catch (error) {
      console.error('취향 분석 실패:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : '취향 분석 중 오류가 발생했습니다.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    // StatsPageLayout: 레이아웃 껍데기를 분리해 PublicLibraryContent와 공유
    <StatsPageLayout>
      {/* Header */}
      <header className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-4xl font-bold tracking-tight text-slate-900'>
            Dashboard
          </h1>
          <p className='text-lg text-slate-500'>
            Overview of your reading journey
          </p>
        </div>

        <div className='flex items-center gap-4'>
          {/* Year Select */}
          <Select
            value={selectedYear.toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className='w-[140px] border-white/40 bg-white/50 backdrop-blur-md'>
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

          <Button
            className='bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
            onClick={handleAnalyzeTaste}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
          </Button>

          {profile?.username && (
            <Button
              variant='outline'
              size='icon'
              onClick={handleCopyPublicUrl}
              className='bg-white/50 backdrop-blur-md border-white/40'
              title='Copy Public URL'
            >
              <span className='sr-only'>Copy URL</span>
              🔗
            </Button>
          )}
        </div>
      </header>

      {/* Top Info Cards (Glass Pills) */}
      <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
        <StatCard
          icon={<BookOpen className='h-5 w-5' />}
          title='Books Read'
          value={stats.totalCompletedBooks}
          unit='Books'
          variant='blue'
        />
        <StatCard
          icon={<FileText className='h-5 w-5' />}
          title='Pages Read'
          value={stats.totalPages}
          unit='Pages'
          variant='purple'
        />
        <StatCard
          icon={<Target className='h-5 w-5' />}
          title='Yearly Goal'
          value={stats.yearlyGoal}
          unit='Books'
          variant='emerald'
        />
        <StatCard
          icon={<CheckCircle className='h-5 w-5' />}
          title='Completion'
          value={stats.completionRate}
          unit='%'
          variant='rose'
        />
      </div>

      {/* Main Grid Section */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Left Column (Hero / Charts) - Spans 2 cols */}
        <div className='space-y-6 lg:col-span-2'>
          {/* Yearly Trend Chart (Glass Card) */}
          <Card className='border border-white/40 bg-white/60 shadow-xl backdrop-blur-xl'>
            <CardHeader>
              <CardTitle>Yearly Reading Trend</CardTitle>
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
          <Card className='border border-white/40 bg-gradient-to-br from-white/60 to-white/30 shadow-xl backdrop-blur-xl'>
            <CardHeader>
              <CardTitle>Total Journey</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <ReadingJourneyCard data={overallStats.journey} />
            </CardContent>
          </Card>

          {/* Reading Goal Progress */}
          <div className='rounded-3xl border border-white/40 bg-white/50 p-6 shadow-xl backdrop-blur-xl'>
            <h3 className='mb-4 text-lg font-bold text-slate-800'>
              Goal Progress
            </h3>
            <ReadingGoalProgress
              year={selectedYear}
              target={isCurrentYearGoal && readingGoal ? readingGoal.target : 0}
              current={completedBooksInYear}
              onSetGoal={() => setIsGoalDialogOpen(true)}
            />
          </div>

          {/* Taste Analysis Promo */}
          <div className='relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-xl'>
            <div className='relative z-10'>
              <h3 className='text-xl font-bold'>Discover Your Taste</h3>
              <p className='mt-2 text-indigo-100 text-sm'>
                Let AI analyze your reading patterns.
              </p>
              <Button
                variant='secondary'
                className='mt-4 w-full border-0 bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                onClick={handleAnalyzeTaste}
              >
                Start Analysis
              </Button>
            </div>
            {/* Decorative circles */}
            <div className='absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl'></div>
            <div className='absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-purple-400/20 blur-2xl'></div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Calendar & Detail List */}
      <div className='space-y-6'>
        {/* Calendar */}
        <div className='rounded-3xl border border-white/40 bg-white/60 shadow-xl backdrop-blur-xl overflow-hidden'>
          <ReadingCalendar
            data={currentCalendarData}
            summary={currentCalendarSummary}
            currentYear={calendarYear}
            currentMonth={calendarMonth}
            isLoading={calendarLoading}
            onPreviousMonth={handlePreviousMonth}
            onNextMonth={handleNextMonth}
          />
        </div>

        {/* Book List */}
        <div className='rounded-3xl border border-white/40 bg-white/60 p-1 shadow-xl backdrop-blur-xl'>
          <Card className='border-0 bg-transparent shadow-none'>
            <CardHeader>
              {/* isFilterPending: 차트 클릭 후 목록 갱신 중임을 표시 */}
              <CardTitle
                style={{
                  opacity: isFilterPending ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                Recent Books
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
                onSearchChange={(query) =>
                  filterDispatch({ type: 'SET_SEARCH', query })
                }
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
        onClose={() => setIsGoalDialogOpen(false)}
        userId={userId}
        currentYear={currentYear}
        currentGoal={readingGoal ?? null}
        onSuccess={() => {
          router.refresh();
        }}
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
    </StatsPageLayout>
  );
};
