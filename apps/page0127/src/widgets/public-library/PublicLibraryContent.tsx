'use client';


import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import { PageContainer } from '@/shared/ui/PageContainer';

import { useLibraryFilters } from '@/features/stats/model/useLibraryFilters';
import { DashboardBookList } from '@/features/stats/ui/DashboardBookList';
import { ReadingProgressOverview } from '@/features/stats/ui/ReadingProgressOverview';

// Recharts 차트 묶음 → 초기 번들에서 제외
const DashboardCharts = dynamic(
  () =>
    import('@/features/stats/ui/DashboardCharts').then(
      (m) => m.DashboardCharts
    ),
  {
    ssr: false,
    loading: () => <div className='h-[700px] animate-pulse bg-muted/50' />,
  }
);

import { PublicBookShelf } from '@/widgets/book/ui/PublicBookShelf';

import { PublicLibraryHeader } from './PublicLibraryHeader';

import type { Book, YearlyTrend } from '@/entities/book';
import type { BookStats } from '@/entities/book';
import type { Profile } from '@/entities/profile/types';

type PublicLibraryContentProps = {
  profile: Profile;
  username: string;
  isOwnProfile: boolean;
  currentUserId?: string;
  books: Book[];
  stats: BookStats;
  yearlyReading: YearlyTrend[];
  availableYears: number[];
  selectedYear: number;
};

/**
 * 공개 서재 컨텐츠 (Client Component)
 *
 * 학습 포인트:
 * - Dashboard와 동일한 구조
 * - 년도별 통계 표시
 * - 독서 목표는 표시만 (수정 불가)
 */
export const PublicLibraryContent = ({
  profile,
  username,
  isOwnProfile,
  currentUserId,
  books,
  stats,
  yearlyReading,
  availableYears,
  selectedYear,
}: PublicLibraryContentProps) => {
  const router = useRouter();

  // 책 목록 필터 상태 — 내 서재와 같은 훅 공유 (useState 5개 → 통합)
  const filters = useLibraryFilters();
  const {
    selectedMonth,
    selectedCategories,
    selectedRating,
    searchQuery,
    statusFilter,
  } = filters;

  // 독서 목표 데이터
  const readingGoal = profile.reading_goal;
  const isCurrentYearGoal = readingGoal?.year === selectedYear;

  const goalTarget = isCurrentYearGoal && readingGoal ? readingGoal.target : 0;

  // 연도 변경 핸들러
  const handleYearChange = (value: string) => {
    router.push(`/${username}?year=${value}`);
  };

  return (
    <PageContainer width='wide' className='space-y-10'>
      {/* 프로필 헤더 */}
      <PublicLibraryHeader
        profile={profile}
        username={username}
        isOwnProfile={isOwnProfile}
        currentUserId={currentUserId}
        availableYears={availableYears}
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
      />

      {/* 책장 자체의 시각 효과는 유지하고, 주변 카드 면만 제거한다. */}
      <section className='py-6'>
        <DashboardBookList
          books={books}
          categories={stats.categoryReading}
          title='책장'
          selectedMonth={selectedMonth}
          selectedCategories={selectedCategories}
          selectedRating={selectedRating}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onCategoriesChange={filters.setCategories}
          onRemoveMonthFilter={filters.clearMonth}
          onRemoveRatingFilter={filters.clearRating}
          onSearchChange={filters.setSearch}
          onStatusChange={filters.setStatus}
          onResetAll={filters.resetAll}
          renderBooks={(filteredBooks) => (
            // compact: 내서재와 같은 선반 규격(210px·좌측 정렬) — 두 서재의 크기·정렬 통일
            <PublicBookShelf books={filteredBooks} username={username} compact />
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
      />

      <section>
        <div className='mb-3'>
          <h2 className='heading-2 text-text-strong'>
            {selectedYear}년 독서 기록
          </h2>
          <p className='mt-1 text-sm text-text-subtle'>
            공개된 책을 기준으로 정리한 독서 흐름입니다.
          </p>
        </div>

        <DashboardCharts
          monthlyReading={stats.monthlyReading}
          yearlyReading={yearlyReading}
          categoryReading={stats.categoryReading}
          ratingReading={stats.ratingReading}
          averageRating={stats.averageRating}
          onMonthClick={filters.toggleMonth}
          onRatingClick={filters.toggleRating}
        />
      </section>
    </PageContainer>
  );
};
