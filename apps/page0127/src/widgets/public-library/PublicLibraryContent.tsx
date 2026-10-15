'use client';

import { useCallback, useMemo, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { PageContainer } from '@repo/ui';

import {
  calculateBookStats,
  dedupeReadings,
  filterBooksByLibraryYear,
  getLibraryYears,
  resolveDefaultLibraryYear,
  resolveGoalTarget,
} from '@/entities/book';

import { CoachTipHost } from '@/features/onboarding';
import { ReadingGoalDialog } from '@/features/profile/ui/ReadingGoalDialog';

import { LibraryView } from '@/widgets/library/LibraryView';

import { pickFanCovers } from './model/fanCovers';
import { PublicLibraryHeader } from './PublicLibraryHeader';
import { VisitorChemiCard, VisitorSignupBanner } from './VisitorCta';

import type { Book } from '@/entities/book';
import type { OverallStats } from '@/entities/book';
import type { Profile } from '@/entities/profile/types';
import type { PublicTasteHistoryItem } from '@/entities/taste-analysis/types';

type PublicLibraryContentProps = {
  profile: Profile;
  username: string;
  isOwnProfile: boolean;
  currentUserId?: string;
  books: Book[];
  overallStats: OverallStats;
  currentYear: number;
  /** 한국 시간 기준 오늘 'YYYY-MM-DD' (서버에서 정한 값) */
  today: string;
  analyzableBookCount: number;
  newBooksSinceLastAnalysis: number | null;
  /** 취향 이력(최신순 ≤10) — 방문자에게도 채워진다 */
  analysisHistory: PublicTasteHistoryItem[];
  tasteAnalysisRemaining: number;
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
  today,
  analyzableBookCount,
  newBooksSinceLastAnalysis,
  analysisHistory,
  tasteAnalysisRemaining,
}: PublicLibraryContentProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const yearParam = searchParams.get('year');
  // 위시리스트는 내 서재에서만, 연도와 무관한 별도 탭이다
  const isWishlistView = isOwnProfile && yearParam === 'wishlist';
  const parsedYear = yearParam ? Number(yearParam) : NaN;
  // 기본은 올해(비었으면 가장 최근 해) — '전체'는 ?year=all 로만 들어간다
  const isAllView = yearParam === 'all' || isWishlistView;
  const defaultYear = useMemo(
    () => resolveDefaultLibraryYear(books, currentYear),
    [books, currentYear]
  );
  const selectedYear =
    !isAllView && Number.isInteger(parsedYear) ? parsedYear : defaultYear;
  const selectedPeriod = isAllView ? null : selectedYear;

  const handleGoalClose = useCallback(() => setIsGoalDialogOpen(false), []);
  const handleGoalSuccess = useCallback(() => router.refresh(), [router]);

  const availableYears = useMemo(
    () => getLibraryYears(books, currentYear),
    [books, currentYear]
  );

  const periodBooks = useMemo(
    () => filterBooksByLibraryYear(books, selectedPeriod, currentYear),
    [books, currentYear, selectedPeriod]
  );

  // 재독은 새 row 로 쌓이므로 그대로 그리면 같은 책이 회독 수만큼 책장에 선다.
  // 공개/보관을 나눈 뒤에 합친다 — 1회독은 공개, 2회독은 보관처럼 회독마다
  // 공개 설정이 다를 수 있어, 합치고 나서 나누면 한쪽 칸에서 통째로 사라진다.
  const archivedBooks = useMemo(
    () => dedupeReadings(periodBooks.filter((book) => !book.is_public)),
    [periodBooks]
  );

  const visibleBooks = useMemo(
    () => dedupeReadings(periodBooks.filter((book) => book.is_public)),
    [periodBooks]
  );

  const publicBooks = useMemo(
    () => books.filter((book) => book.is_public),
    [books]
  );

  // 위시리스트는 내 개인 목록이라 연도·공개여부와 무관하게 전부 모은다
  const wishlistBooks = useMemo(
    () =>
      dedupeReadings(books.filter((book) => book.status === 'want_to_read')),
    [books]
  );

  const stats = useMemo(
    () => calculateBookStats(publicBooks, selectedPeriod, currentYear),
    [currentYear, publicBooks, selectedPeriod]
  );

  // 가입 배너의 부채꼴 — 주인의 공개 완독 책 중 가장 최근 3권(표지가 있는 것)
  const recentCovers = useMemo(() => pickFanCovers(publicBooks), [publicBooks]);

  // 달력: 방문자는 공개만(books 가 이미 공개만 온다), 주인은 비공개까지 — 반투명으로 그린다
  const calendarBooks = isOwnProfile ? books : publicBooks;

  // 균형 카드: 통계와 같은 집합(공개 책, 재독 합침)으로 올해와 작년을 센다
  const balanceBooks = useMemo(
    () => ({
      current: dedupeReadings(
        filterBooksByLibraryYear(publicBooks, selectedYear, currentYear)
      ),
      previous: dedupeReadings(
        filterBooksByLibraryYear(publicBooks, selectedYear - 1, currentYear)
      ),
    }),
    [publicBooks, selectedYear, currentYear]
  );

  // 로그인하지 않은 방문자 — 가입 길(VisitorCta)을 보여 줄 대상
  const isVisitor = !currentUserId;
  const ownerName = profile.nickname || username;

  const readingGoal = profile.reading_goal;
  // 주인·방문자 모두 "그 해에 정한 목표"만 쓴다 — 없으면 0(목표 정하기)
  const goalTarget = resolveGoalTarget(readingGoal, selectedYear);

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
        analyzableBookCount={analyzableBookCount}
        newBooksSinceLastAnalysis={newBooksSinceLastAnalysis}
        analysisHistory={analysisHistory}
        tasteAnalysisRemaining={tasteAnalysisRemaining}
      />

      {/* 비로그인 방문자에게만 — 로그인한 다른 사용자는 이미 자기 책장이 있다 */}
      {isVisitor && (
        <VisitorChemiCard name={ownerName} photoUrl={profile.photo_url} />
      )}

      <LibraryView
        overallStats={overallStats}
        stats={stats}
        books={visibleBooks}
        availableYears={availableYears}
        selectedYear={selectedYear}
        isAllView={isAllView}
        currentYear={currentYear}
        today={today}
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
        calendarBooks={calendarBooks}
        showWishlist={isOwnProfile}
        isOwner={isOwnProfile}
        isWishlistView={isWishlistView}
        wishlistBooks={wishlistBooks}
        privateBooks={isOwnProfile ? archivedBooks : []}
        balanceBooks={balanceBooks}
      />

      {isVisitor && (
        <VisitorSignupBanner name={ownerName} covers={recentCovers} />
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

      {/* 첫 사용 가이드 — 지금 남은 일 하나만 말풍선으로 짚어 준다 */}
      {isOwnProfile && currentUserId && (
        <CoachTipHost
          userId={currentUserId}
          facts={{
            isOwner: isOwnProfile,
            bookCount: books.length,
            // 지난해 목표만 있으면 올해 목표는 아직 없는 것이다
            hasReadingGoal: readingGoal?.year === currentYear,
            analyzableBookCount,
            hasTasteAnalysis: analysisHistory.length > 0,
          }}
          actions={{
            'set-goal': {
              label: '목표 정하기',
              onClick: () => setIsGoalDialogOpen(true),
            },
          }}
        />
      )}
    </PageContainer>
  );
};
