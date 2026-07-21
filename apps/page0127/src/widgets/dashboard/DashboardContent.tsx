'use client';

import { useCallback, useState } from 'react';

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
import { PageContainer } from '@/shared/ui/PageContainer';

import { ReadingGoalDialog } from '@/features/profile/ui/ReadingGoalDialog';

// 통계 본문은 공개 서재와 공유한다 (widgets/library/LibraryView)
import { LibraryView } from '@/widgets/library/LibraryView';

import type { Book } from '@/entities/book';
import type { BookStats, OverallStats } from '@/entities/book';
import type { Profile } from '@/entities/profile/types';

type DashboardContentProps = {
  /** 전체 독서 통계 (연도 무관) */
  overallStats: OverallStats;

  /** 통계 데이터 */
  stats: BookStats;

  /** 완독한 책 목록 (선택된 연도로 필터링됨) */
  books: Book[];

  /** 취향 분석 게이트용 — 전체 기록 중 완독+별점 있는 책 수 (연도 무관) */
  analyzableBookCount: number;

  /** 사용자 이메일 */
  userEmail: string;

  /** 사용 가능한 연도 목록 */
  availableYears: number[];

  /** 현재 선택된 연도 (전체 뷰에서도 목표·차트 기준으로 올해가 들어온다) */
  selectedYear: number;

  /** 전체(누적) 뷰인지 — false면 selectedYear 연도 뷰 */
  isAllView: boolean;

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
  analyzableBookCount,
  userEmail: _userEmail,
  availableYears,
  selectedYear,
  isAllView,
  profile,
  currentYear,
  calendarSlot,
}: DashboardContentProps) => {
  const router = useRouter();

  // 필터 상태는 LibraryView가 소유한다 (차트 클릭과 책장이 같은 상태를 공유)

  // 단순 boolean은 useState가 적합 — useReducer는 복합 상태에 써야 의미 있음
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);

  // ReadingGoalDialog의 useEffect deps에 들어가므로 참조를 안정화 (useCallback)
  const handleGoalClose = useCallback(() => setIsGoalDialogOpen(false), []);
  const handleGoalSuccess = useCallback(() => router.refresh(), [router]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzeDialogOpen, setIsAnalyzeDialogOpen] = useState(false);

  // 독서 목표 데이터
  const readingGoal = profile?.reading_goal;
  const goalTarget =
    readingGoal?.year === selectedYear ? readingGoal.target : stats.yearlyGoal;

  // 연도 변경 핸들러
  // value: 'all'(전체 누적) 또는 연도 문자열. 세그먼티드 탭에서 호출된다.
  const handleViewChange = (value: string) => {
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
  // books는 선택 연도로 필터링돼 있으므로, 게이트 판정은 전체 기준 카운트를 쓴다.
  // (실제 분석도 서버에서 전체 책으로 수행된다)
  const handleAnalyzeTaste = () => {
    if (analyzableBookCount < 5) {
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

        {/* 연도 셀렉트는 아래 '연도별 기록' 섹션으로 이동 — header엔 액션만 둔다 */}
        <div className='flex flex-wrap items-center gap-3'>
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

      {/* 통계 본문 — 공개 서재와 공유하는 컴포넌트 */}
      <LibraryView
        overallStats={overallStats}
        stats={stats}
        books={books}
        availableYears={availableYears}
        selectedYear={selectedYear}
        isAllView={isAllView}
        currentYear={currentYear}
        goalTarget={goalTarget}
        onViewChange={handleViewChange}
        allShelfTitle='내 서재 전체'
        onSetGoal={() => setIsGoalDialogOpen(true)}
        calendarSlot={calendarSlot}
      />

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
