'use client';

import { useCallback, useMemo, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Archive, Library } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/PageContainer';

import {
  calculateBookStats,
  filterBooksByLibraryYear,
  getLibraryYears,
} from '@/entities/book';

import { ReadingGoalDialog } from '@/features/profile/ui/ReadingGoalDialog';

import { PublicBookShelf } from '@/widgets/book/ui/PublicBookShelf';
import { LibraryView } from '@/widgets/library/LibraryView';

import { PublicLibraryHeader } from './PublicLibraryHeader';

import type { Book } from '@/entities/book';
import type { OverallStats } from '@/entities/book';
import type { Profile } from '@/entities/profile/types';
import type { TasteAnalysisSummary } from '@/entities/taste-analysis/types';

type PublicLibraryContentProps = {
  profile: Profile;
  username: string;
  isOwnProfile: boolean;
  currentUserId?: string;
  books: Book[];
  overallStats: OverallStats;
  currentYear: number;
  personalityType: string | null;
  analyzableBookCount: number;
  newBooksSinceLastAnalysis: number | null;
  analysisHistory: TasteAnalysisSummary[];
  tasteAnalysisRemaining: number;
  /** 소유자 모드에서만 주입되는 캘린더 슬롯 (방문자는 undefined) */
  calendarSlot?: React.ReactNode;
};

/**
 * 서재 컨텐츠 (Client Component)
 *
 * 예전엔 '공개 서재'와 '내 서재(DashboardContent)'가 따로였는데,
 * 이제 이 컴포넌트 하나가 isOwnProfile로 두 모드를 다 담당한다.
 * - 소유자: 목표 설정, 캘린더, 취향분석(PublicLibraryHeader가 담당)
 * - 방문자: 읽기 전용
 */
export const PublicLibraryContent = ({
  profile,
  username,
  isOwnProfile,
  currentUserId,
  books,
  overallStats,
  currentYear,
  personalityType,
  analyzableBookCount,
  newBooksSinceLastAnalysis,
  analysisHistory,
  tasteAnalysisRemaining,
  calendarSlot,
}: PublicLibraryContentProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const yearParam = searchParams.get('year');
  // 위시리스트는 내 서재에서만, 연도와 무관한 별도 탭이다
  const isWishlistView = isOwnProfile && yearParam === 'wishlist';
  const parsedYear = yearParam ? Number(yearParam) : NaN;
  const isAllView = !yearParam || yearParam === 'all' || isWishlistView;
  const selectedYear =
    !isAllView && Number.isInteger(parsedYear) ? parsedYear : currentYear;
  const selectedPeriod = isAllView ? null : selectedYear;

  const handleGoalClose = useCallback(() => setIsGoalDialogOpen(false), []);
  const handleGoalSuccess = useCallback(() => router.refresh(), [router]);

  const [showArchived, setShowArchived] = useState(false);

  const availableYears = useMemo(
    () => getLibraryYears(books, currentYear),
    [books, currentYear]
  );

  const periodBooks = useMemo(
    () => filterBooksByLibraryYear(books, selectedPeriod, currentYear),
    [books, currentYear, selectedPeriod]
  );

  const archivedBooks = useMemo(
    () => periodBooks.filter((book) => !book.is_public),
    [periodBooks]
  );

  const visibleBooks = useMemo(
    () => periodBooks.filter((book) => book.is_public),
    [periodBooks]
  );

  const publicBooks = useMemo(
    () => books.filter((book) => book.is_public),
    [books]
  );

  // 위시리스트는 내 개인 목록이라 연도·공개여부와 무관하게 전부 모은다
  const wishlistBooks = useMemo(
    () => books.filter((book) => book.status === 'want_to_read'),
    [books]
  );

  const stats = useMemo(
    () => calculateBookStats(publicBooks, selectedPeriod, currentYear),
    [currentYear, publicBooks, selectedPeriod]
  );

  const readingGoal = profile.reading_goal;
  const goalTarget =
    readingGoal?.year === selectedYear
      ? readingGoal.target
      : isOwnProfile
        ? stats.yearlyGoal
        : 0;

  const handleViewChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', value);

    // Next.js가 History API를 useSearchParams와 동기화하므로 서버 재요청 없이
    // URL·뒤로가기 기록은 유지하면서 화면만 즉시 바뀐다.
    window.history.pushState(null, '', `${pathname}?${params.toString()}`);
  };

  return (
    <PageContainer width='wide' bg='sunken' className='space-y-10'>
      <PublicLibraryHeader
        profile={profile}
        username={username}
        isOwnProfile={isOwnProfile}
        currentUserId={currentUserId}
        personalityType={personalityType}
        analyzableBookCount={analyzableBookCount}
        newBooksSinceLastAnalysis={newBooksSinceLastAnalysis}
        analysisHistory={analysisHistory}
        tasteAnalysisRemaining={tasteAnalysisRemaining}
      />

      <LibraryView
        overallStats={overallStats}
        stats={stats}
        books={visibleBooks}
        availableYears={availableYears}
        selectedYear={selectedYear}
        isAllView={isAllView}
        currentYear={currentYear}
        goalTarget={goalTarget}
        onViewChange={handleViewChange}
        allShelfTitle={
          isOwnProfile
            ? '내 서재 전체'
            : `${profile.nickname || username}님의 서재 전체`
        }
        lifeBooksTitle={
          isOwnProfile
            ? '내 인생책'
            : `${profile.nickname || username}의 인생책이에요!`
        }
        username={username}
        onSetGoal={isOwnProfile ? () => setIsGoalDialogOpen(true) : undefined}
        calendarSlot={isOwnProfile ? calendarSlot : undefined}
        showWishlist={isOwnProfile}
        isWishlistView={isWishlistView}
        wishlistBooks={wishlistBooks}
      />

      {!isWishlistView && isOwnProfile && archivedBooks.length > 0 && (
        <div className='space-y-4'>
          <div className='flex items-center gap-2'>
            <Button
              variant={showArchived ? 'outline' : 'secondary'}
              size='sm'
              onClick={() => setShowArchived(false)}
            >
              <Library className='h-4 w-4' />
              책장
            </Button>
            <Button
              variant={showArchived ? 'secondary' : 'outline'}
              size='sm'
              onClick={() => setShowArchived(true)}
            >
              <Archive className='h-4 w-4' />
              보관 {archivedBooks.length}
            </Button>
          </div>

          {showArchived && (
            <PublicBookShelf
              books={archivedBooks}
              username={username}
              bookHref={(book) => `/${username}/${book.id}`}
            />
          )}
        </div>
      )}

      {isOwnProfile && (
        <ReadingGoalDialog
          isOpen={isGoalDialogOpen}
          onClose={handleGoalClose}
          currentYear={currentYear}
          currentGoal={readingGoal ?? null}
          onSuccess={handleGoalSuccess}
        />
      )}
    </PageContainer>
  );
};
