'use client';

import { useTransition } from 'react';

import dynamic from 'next/dynamic';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

import { useLibraryFilters } from '@/features/stats/model/useLibraryFilters';
import { CategoryRadarChart } from '@/features/stats/ui/CategoryRadarChart';
import { DashboardBookList } from '@/features/stats/ui/DashboardBookList';
import { OverallDistribution } from '@/features/stats/ui/OverallDistribution';
import { ReadingProgressOverview } from '@/features/stats/ui/ReadingProgressOverview';
import { YearlyTrendChart } from '@/features/stats/ui/YearlyTrendChart';

import { CategoryBookShelf } from '@/widgets/book/ui/CategoryBookShelf';
import { LifeBooksShelf } from '@/widgets/book/ui/LifeBooksShelf';
import { PublicBookShelf } from '@/widgets/book/ui/PublicBookShelf';
import { ReadingJourneyCard } from '@/widgets/dashboard/ReadingJourneyCard';
import { ViewTabs } from '@/widgets/dashboard/ViewTabs';

import { ReadingNowStrip } from './ReadingNowStrip';
import { WishlistShelf } from './WishlistShelf';

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

type LibraryViewProps = {
  /** 전체 독서 통계 (연도 무관) */
  overallStats: OverallStats;

  /** 선택 연도 기준 통계 */
  stats: BookStats;

  /** 책 목록 (전체 뷰=전부, 연도 뷰=그 해) */
  books: Book[];

  /** 사용 가능한 연도 목록 */
  availableYears: number[];

  /** 현재 선택된 연도 */
  selectedYear: number;

  /** 전체(누적) 뷰인지 — false면 연도 뷰 */
  isAllView: boolean;

  /** 현재 연도 */
  currentYear: number;

  /** 해당 연도의 독서 목표 권수 (0이면 목표 없음) */
  goalTarget: number;

  /** 탭 전환 — 라우팅 경로가 화면마다 달라 콜백으로 받는다 */
  onViewChange: (value: string) => void;

  /** 전체 뷰의 책장 제목 (서재 성격에 따라 다르게) */
  allShelfTitle?: string;

  /** 전체 뷰의 인생책 섹션 제목 (소유자 "내 인생책" / 방문자 "OO님의 인생책") */
  lifeBooksTitle?: string;

  /** 공개 서재에서 책 링크에 쓸 username (내 서재는 생략) */
  username?: string;

  /** 목표 설정 — 소유자에게만 전달 (없으면 버튼 자체가 안 보인다) */
  onSetGoal?: () => void;

  /** 캘린더 슬롯 — 내 서재에서만 주입 */
  calendarSlot?: React.ReactNode;

  /** '읽고 싶어요' 탭 노출 여부 (내 서재에서만 true) */
  showWishlist?: boolean;

  /** 지금 위시리스트 뷰를 보고 있는지 (탭 상태는 상위가 URL로 소유) */
  isWishlistView?: boolean;

  /** 위시리스트 책 목록 — 연도와 무관한 전체 want_to_read (내 서재만 주입) */
  wishlistBooks?: Book[];
};

/**
 * 서재 본문 (내 서재 · 공개 서재 공용)
 *
 * 왜 공유하는가:
 * - 두 화면의 '통계 본문'은 원래 같은 것이었는데 위젯이 갈라져 있어
 *   한 번 고칠 때마다 양쪽을 똑같이 수정해야 했다.
 * - 헤더·액션·다이얼로그처럼 화면마다 다른 부분은 각 위젯에 남기고,
 *   여기서는 '탭 + 통계 + 책장'만 담당한다.
 *
 * 필터 상태를 이 컴포넌트가 소유한다 — 차트 클릭과 책장 필터가
 * 같은 상태를 공유해야 하므로, 둘을 함께 가진 여기가 맞는 위치다.
 */
export const LibraryView = ({
  overallStats,
  stats,
  books,
  availableYears,
  selectedYear,
  isAllView,
  currentYear,
  goalTarget,
  onViewChange,
  allShelfTitle = '서재 전체',
  lifeBooksTitle = '인생책',
  username,
  onSetGoal,
  calendarSlot,
  showWishlist = false,
  isWishlistView = false,
  wishlistBooks = [],
}: LibraryViewProps) => {
  const filters = useLibraryFilters();
  const { selectedMonth, selectedCategories, selectedRating, searchQuery } =
    filters;

  // 링크 계산은 세 곳(읽는 중 스트립·완독 shelf·위시리스트)이 같은 규칙을 써야 한다
  const bookHref = (book: Book) =>
    username ? `/${username}/${book.id}` : `/books/${book.id}`;

  // status로 3분할 — 서재 본문은 완독만, 읽는 중은 상단 스트립, 읽고 싶은은 별도 탭
  const readingBooks = books.filter((book) => book.status === 'reading');
  const completedBooks = books.filter((book) => book.status === 'completed');

  // 차트 클릭 → 목록 필터링은 급하지 않음 → 우선순위를 낮춰 입력 응답성을 지킨다
  const [isFilterPending, startFilterTransition] = useTransition();

  const handleMonthClick = (month: number) =>
    startFilterTransition(() => filters.toggleMonth(month));

  const handleRatingClick = (rating: number) =>
    startFilterTransition(() => filters.toggleRating(rating));

  // 책장 제목은 지금 보는 범위를 그대로 말한다
  const shelfTitle = isAllView ? allShelfTitle : `${selectedYear}년 서재`;

  const bookShelf = (
    <div className='space-y-6 py-6'>
      {/* 읽는 중은 필터와 무관하게 항상 앞세운다 → 필터 dimming 밖에 둔다 */}
      <ReadingNowStrip books={readingBooks} bookHref={bookHref} />

      <section
        style={{
          opacity: isFilterPending ? 0.6 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        <DashboardBookList
          title={shelfTitle}
          books={completedBooks}
          categories={stats.categoryReading}
          selectedMonth={selectedMonth}
          selectedCategories={selectedCategories}
          selectedRating={selectedRating}
          searchQuery={searchQuery}
          onCategoriesChange={filters.setCategories}
          onRemoveMonthFilter={filters.clearMonth}
          onRemoveRatingFilter={filters.clearRating}
          onSearchChange={filters.setSearch}
          onResetAll={filters.resetAll}
          // 책장형은 PublicBookShelf/CategoryBookShelf가 username으로 직접 링크를 계산하지만,
          // 피드형(BookFeedGrid)은 DashboardBookList 내부에서 렌더링되므로
          // bookHref를 통해 공개 서재/내 서재 링크를 구분해 넘겨야 한다
          bookHref={bookHref}
          renderBooks={(filteredBooks) =>
            isAllView ? (
              <CategoryBookShelf books={filteredBooks} username={username} />
            ) : (
              <PublicBookShelf
                books={filteredBooks}
                username={username}
                compact
              />
            )
          }
        />
      </section>
    </div>
  );

  return (
    <>
      <section className='space-y-6'>
        <ViewTabs
          years={availableYears}
          selectedYear={selectedYear}
          isAllView={isAllView}
          onChange={onViewChange}
          showWishlist={showWishlist}
          isWishlistView={isWishlistView}
        />

        {isWishlistView ? (
          /* ── 읽고 싶어요(위시리스트) 뷰 ── 서재와 분리된 별도 목록 */
          <WishlistShelf books={wishlistBooks} bookHref={bookHref} />
        ) : isAllView ? (
          /* ── 전체(누적) 뷰 ── */
          <div className='space-y-6'>
            <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
              <Card className='rounded-2xl bg-card py-6 shadow-none'>
                <CardHeader>
                  <CardTitle>지금까지의 기록</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <ReadingJourneyCard data={overallStats.journey} />
                </CardContent>
              </Card>

              <Card className='rounded-2xl bg-card py-6 shadow-none lg:col-span-2'>
                <CardHeader className='pb-4'>
                  <CardTitle>연도별 완독 추이</CardTitle>
                  <p className='text-sm text-muted-foreground'>
                    올해를 강조해 연도별 완독 권수를 비교합니다
                  </p>
                </CardHeader>
                <CardContent className='pb-6'>
                  <YearlyTrendChart data={overallStats.yearlyTrend} />
                </CardContent>
              </Card>
            </div>

            {/* ── 인생책 (평점 10점) ── 서재 요약과 상세 통계 사이의 감정적 하이라이트 */}
            <LifeBooksShelf
              books={books}
              title={lifeBooksTitle}
              username={username}
            />

            <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
              <Card className='rounded-2xl bg-card py-6 shadow-none'>
                <CardHeader className='pb-4'>
                  <CardTitle>카테고리 취향</CardTitle>
                  <p className='text-sm text-muted-foreground'>
                    전체 완독 기준으로 정리했습니다
                  </p>
                </CardHeader>
                <CardContent className='pb-6'>
                  <CategoryRadarChart
                    data={overallStats.categoryDistribution}
                  />
                </CardContent>
              </Card>

              <Card className='rounded-2xl bg-card py-6 shadow-none'>
                <CardHeader className='pb-4'>
                  <CardTitle>평점 분포</CardTitle>
                  <p className='text-sm text-muted-foreground'>
                    전체 완독 기준입니다
                  </p>
                </CardHeader>
                <CardContent className='pb-6'>
                  <OverallDistribution
                    ratings={overallStats.ratingDistribution}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* ── 연도 뷰 ── 그 해 읽은 책이 주인공이라 책장을 통계 위로 */
          <div className='space-y-6'>
            {bookShelf}

            <ReadingProgressOverview
              year={selectedYear}
              currentYear={currentYear}
              completed={stats.totalCompletedBooks}
              target={goalTarget}
              totalPages={stats.totalPages}
              averageRating={stats.averageRating}
              favoriteBooks={stats.fiveStarBooks}
              books={books}
              onSetGoal={
                onSetGoal && selectedYear === currentYear
                  ? onSetGoal
                  : undefined
              }
            />

            <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
              <div className='space-y-6 lg:col-span-2'>
                <DashboardCharts
                  monthlyReading={stats.monthlyReading}
                  categoryReading={stats.categoryReading}
                  ratingReading={stats.ratingReading}
                  averageRating={stats.averageRating}
                  onMonthClick={handleMonthClick}
                  onRatingClick={handleRatingClick}
                />
              </div>
              {calendarSlot && <div className='space-y-6'>{calendarSlot}</div>}
            </div>
          </div>
        )}
      </section>

      {/* 전체 뷰는 통계가 주인공 → 책장을 맨 아래에 둔다 (위시리스트 뷰는 제외) */}
      {!isWishlistView && isAllView && bookShelf}
    </>
  );
};
