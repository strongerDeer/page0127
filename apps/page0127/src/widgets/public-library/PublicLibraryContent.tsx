'use client';

import { useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Archive, Library } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/PageContainer';

import { ReadingGoalDialog } from '@/features/profile/ui/ReadingGoalDialog';

import { PublicBookShelf } from '@/widgets/book/ui/PublicBookShelf';
import { LibraryView } from '@/widgets/library/LibraryView';

import { PublicLibraryHeader } from './PublicLibraryHeader';

import type { Book } from '@/entities/book';
import type { BookStats, OverallStats } from '@/entities/book';
import type { Profile } from '@/entities/profile/types';
import type { TasteAnalysisSummary } from '@/entities/taste-analysis/types';

type PublicLibraryContentProps = {
  profile: Profile;
  username: string;
  isOwnProfile: boolean;
  currentUserId?: string;
  books: Book[];
  stats: BookStats;
  overallStats: OverallStats;
  availableYears: number[];
  selectedYear: number;
  isAllView: boolean;
  currentYear: number;
  personalityType: string | null;
  analyzableBookCount: number;
  newBooksSinceLastAnalysis: number | null;
  analysisHistory: TasteAnalysisSummary[];
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
  stats,
  overallStats,
  availableYears,
  selectedYear,
  isAllView,
  currentYear,
  personalityType,
  analyzableBookCount,
  newBooksSinceLastAnalysis,
  analysisHistory,
  calendarSlot,
}: PublicLibraryContentProps) => {
  const router = useRouter();
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);

  const handleGoalClose = useCallback(() => setIsGoalDialogOpen(false), []);
  const handleGoalSuccess = useCallback(() => router.refresh(), [router]);

  const readingGoal = profile.reading_goal;
  const goalTarget =
    readingGoal?.year === selectedYear
      ? readingGoal.target
      : isOwnProfile
        ? stats.yearlyGoal
        : 0;

  const [showArchived, setShowArchived] = useState(false);

  const archivedBooks = useMemo(
    () => books.filter((book) => !book.is_public),
    [books]
  );

  const visibleBooks = useMemo(
    () => books.filter((book) => book.is_public),
    [books]
  );

  const handleViewChange = (value: string) => {
    router.push(`/${username}?year=${value}`);
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
      />

      <LibraryView
        overallStats={overallStats}
        stats={stats}
        books={isOwnProfile ? visibleBooks : books}
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
        username={username}
        onSetGoal={isOwnProfile ? () => setIsGoalDialogOpen(true) : undefined}
        calendarSlot={isOwnProfile ? calendarSlot : undefined}
      />

      {isOwnProfile && archivedBooks.length > 0 && (
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
