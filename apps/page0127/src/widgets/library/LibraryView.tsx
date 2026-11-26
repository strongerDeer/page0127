'use client';

import { type ReactNode, useTransition } from 'react';

import dynamic from 'next/dynamic';
import Link from 'next/link';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { ChevronDown, Plus } from 'lucide-react';

import { RenderWhenNear } from '@/shared/ui/RenderWhenNear';

import { calculateReadingBalance } from '@/entities/book';

import { ShareSheetButton } from '@/features/share';
import { bookendCategory } from '@/features/stats/model/orderByCategory';
import {
  hasActiveShelfFilter,
  useLibraryFilters,
} from '@/features/stats/model/useLibraryFilters';
import { DashboardBookList } from '@/features/stats/ui/DashboardBookList';
import { OverallDistribution } from '@/features/stats/ui/OverallDistribution';
import { RatingSummaryCard } from '@/features/stats/ui/RatingSummaryCard';
import { ReadingBalanceCard } from '@/features/stats/ui/ReadingBalanceCard';
import { YearSummary } from '@/features/stats/ui/YearSummary';

import { PublicBookShelf } from '@/widgets/book/ui/PublicBookShelf';
import { ReadingJourneyCard } from '@/widgets/dashboard/ReadingJourneyCard';
import { ViewTabs } from '@/widgets/dashboard/ViewTabs';

import { LibrarySectionNav } from './LibrarySectionNav';
import { NextBookSlot } from './NextBookSlot';
import { ReadingCalendar } from './ReadingCalendar';
import { ReadingNowStrip } from './ReadingNowStrip';
import { ReadingRecord } from './ReadingRecord';
import { TodaySentenceBanner } from './TodaySentenceBanner';
import { WishlistShelf } from './WishlistShelf';

import type { Book } from '@/entities/book';
import type { BookStats, OverallStats } from '@/entities/book';
import type { DailySentence } from '@/entities/daily-sentence';
import type { ReadingGoal } from '@/entities/profile/types';
import type { SentenceMonthCounts } from '@/entities/quote';
import type { RatingFilter } from '@/features/stats/model/useLibraryFilters';

// 연도별 추이는 recharts(압축 약 90KB) — 프로필 첫 화면 JS 에 실리지 않게 나중에 불러온다.
// 브라우저 측정(ResponsiveContainer)이 필요해 SSR 에서도 뺀다. 자리는 차트 높이(300px)만큼 잡아 둔다(CLS)
// dynamic 만으로는 hydration 직후 바로 받으므로, RenderWhenNear 로 화면 가까이서 그린다(2026-11-23)
const TrendChartSkeleton = () => (
  <div className='h-[300px] animate-pulse rounded-lg bg-muted' />
);
const YearlyTrendChart = dynamic(
  () =>
    import('@/features/stats/ui/YearlyTrendChart').then(
      (m) => m.YearlyTrendChart
    ),
  {
    ssr: false,
    loading: TrendChartSkeleton,
  }
);

/** 목표 달성 이미지를 그리는 동안의 문구 — 서재 스토리와 같은 책장을 세운다 */
const GOAL_STORY_LOADING = {
  title: '달성 이미지를 그리고 있어요',
  wait: '올해 책장을 펼치는 중…',
  slow: '올해 읽은 책을 한 권씩 꽂는 중이에요. 조금만 기다려 주세요.',
};

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

  /** 한국 시간 기준 오늘 'YYYY-MM-DD' — 속도 계산·달력의 기준 */
  today: string;

  /** 해당 연도의 독서 목표 권수 (0이면 목표 없음) */
  goalTarget: number;

  /** 탭 전환 — 라우팅 경로가 화면마다 달라 콜백으로 받는다 */
  onViewChange: (value: string) => void;

  /** 전체 뷰의 책장 제목 (서재 성격에 따라 다르게) */
  allShelfTitle?: string;

  /** 공개 서재에서 책 링크에 쓸 username (내 서재는 생략) */
  username?: string;

  /**
   * 지금 이 서재의 주인이 보고 있는지.
   *
   * ⚠️ `username` 유무로는 판별할 수 없다 — 내 서재로 들어가도 `/[username]` 으로
   * 넘어오기 때문에 주인도 방문자도 같은 라우트를 본다. 빈 서재 안내 문구가
   * "첫 책을 기록해 보세요"(주인) / "아직 공개된 기록이 없어요"(방문자)로 갈린다.
   */
  isOwner?: boolean;

  /** 목표 설정 — 소유자에게만 전달 (없으면 버튼 자체가 안 보인다) */
  onSetGoal?: () => void;

  /** 달력에 그릴 책 — 방문자는 공개만, 주인은 비공개 포함(반투명) */
  calendarBooks?: Book[];
  /** 주인에게만 — 오늘의 문장을 펼친 날에 캘린더 책갈피를 꽂는다 */
  sentenceDraws?: DailySentence[];
  /** 캘린더 오늘 패널에 넣을 것(주인: 오늘의 문장 펼치기) */
  calendarTodaySlot?: ReactNode;
  /** 캘린더 패널 맨 아래(주인: 내가 모은 문장 한 줄) */
  calendarFooterSlot?: ReactNode;
  /** 달력 아래 완독 줄 오른쪽(주인: 문장 서랍·주간 회상 바로가기) */
  calendarSummaryLinks?: ReactNode;
  /** 방문자 캘린더의 "N월에 모은 문장 N개" — 개수만 */
  sentenceMonthCounts?: SentenceMonthCounts;
  /** 해마다 정한 목표 — 연도별 완독 추이에 겹쳐 그린다 */
  readingGoals?: ReadingGoal[];
  /** 배지 줄 — 취향 묶음 맨 아래에 둔다(HJ, 2026-11-11). 예전엔 프로필 바로 아래였다 */
  badgeSlot?: ReactNode;

  /** '읽고 싶어요' 탭 노출 여부 (내 서재에서만 true) */
  showWishlist?: boolean;

  /** 지금 위시리스트 뷰를 보고 있는지 (탭 상태는 상위가 URL로 소유) */
  isWishlistView?: boolean;

  /** 위시리스트 책 목록 — 연도와 무관한 전체 want_to_read (내 서재만 주입) */
  wishlistBooks?: Book[];

  /** 균형 계산용 — 선택 연도와 그 전 해의 공개 완독 책 */
  balanceBooks?: { current: Book[]; previous: Book[] };

  /**
   * 이 서재에 기록이 하나도 없는지 (주인=비공개·읽고 싶어요 포함 전체, 방문자=공개분).
   *
   * `books` 는 지금 탭(연도)의 책뿐이라 "그 해만 비었다"와 "처음 왔다"를 가리지 못한다.
   * 비공개 책만 있는 주인에게 "첫 책을 기록해 보세요"를 보이면 사실과 다르다.
   */
  isLibraryEmpty?: boolean;
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
  today,
  goalTarget,
  onViewChange,
  allShelfTitle = '서재 전체',
  username,
  isOwner = false,
  onSetGoal,
  calendarBooks = [],
  sentenceDraws = [],
  calendarTodaySlot,
  calendarFooterSlot,
  calendarSummaryLinks,
  sentenceMonthCounts,
  readingGoals = [],
  badgeSlot,
  showWishlist = false,
  isWishlistView = false,
  wishlistBooks = [],
  balanceBooks = { current: [], previous: [] },
  isLibraryEmpty = false,
}: LibraryViewProps) => {
  const filters = useLibraryFilters();
  const { selectedCategories, selectedRating, searchQuery } = filters;

  // 링크 계산은 세 곳(읽는 중 스트립·완독 shelf·위시리스트)이 같은 규칙을 써야 한다
  const bookHref = (book: Book) =>
    username ? `/${username}/${book.id}` : `/books/${book.id}`;

  // status로 3분할 — 서재 본문은 완독만, 읽는 중은 상단 스트립, 읽고 싶은은 별도 탭
  const readingBooks = books.filter((book) => book.status === 'reading');
  const completedBooks = books.filter((book) => book.status === 'completed');

  // 차트 클릭 → 목록 필터링은 급하지 않음 → 우선순위를 낮춰 입력 응답성을 지킨다
  const [isFilterPending, startFilterTransition] = useTransition();

  const handleRatingClick = (rating: RatingFilter) =>
    startFilterTransition(() => filters.toggleRating(rating));

  /*
    기록이 하나도 없을 때는 안내를 **통계보다 먼저** 보여준다 — 연도 뷰·전체 뷰 둘 다.

    처음 가입한 사람이 가장 먼저 보는 건 연도 뷰(올해)다. 예전엔 이 안내가 전체 뷰에만
    있어서, 첫 화면은 "0권" 큰 숫자와 "조건에 맞는 책이 없어요"로 시작했다.
    숫자만 놓으면 초대가 아니라 **빈 성적표**로 읽힌다. 같은 이유로 공유
    카드에서도 0권일 때는 숫자를 세지 않기로 했다
    (app/(public)/[username]/opengraph-image.tsx).

    통계 카드를 지우지는 않지만 **접어 둔다**. 다 펼쳐 두면 "올해 첫 완독", "꽂힌 책 없음",
    "분야가 채워져요", 0 으로 찬 달력·평점까지 빈 안내가 줄줄이 반복돼 지쳐 보인다.
    안내는 맨 위 하나로 충분하고, 어디가 채워지는지는 궁금한 사람만 펼쳐 본다.

    모바일 GNB 의 "도서 추가"는 + 아이콘뿐이라 "상단 도서 추가"라는 말만으로는
    찾기 어렵다 → 주인에게는 여기서 바로 가는 버튼을 준다.
  */
  const isGoalPinned = isLibraryEmpty && goalTarget > 0;

  const emptyNotice = isLibraryEmpty && (
    <Card className='rounded-2xl border-dashed bg-card py-6 shadow-none'>
      <CardHeader>
        <CardTitle>
          {isOwner ? '첫 책을 기록해 보세요' : '아직 공개된 기록이 없어요'}
        </CardTitle>
        <p className='text-sm text-muted-foreground'>
          {isOwner
            ? '한 권을 넣으면 아래 통계가 채워지기 시작합니다. 한 권이면 충분해요.'
            : '이 서재의 주인이 책을 공개하면 여기에 쌓입니다.'}
        </p>
      </CardHeader>
      {isOwner && (
        <CardContent className='flex flex-wrap gap-2'>
          <Button asChild size='sm'>
            <Link href='/books/add'>
              <Plus aria-hidden='true' />
              도서 추가
            </Link>
          </Button>
          {/* 목표 버튼은 아래 접힌 올해 요약 안에도 있지만, 접혀 있으면 못 찾는다.
            목표를 정해 요약이 밖으로 나와 있으면(연도 뷰) 거기 '목표 수정'이 있으니 겹치지 않게 뺀다 */}
          {onSetGoal && !(isGoalPinned && !isAllView) && (
            <Button variant='outline' size='sm' onClick={onSetGoal}>
              올해 목표 정하기
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );

  // 기록이 없을 때 통계·책장을 접어 두는 틀 — 기록이 있으면 그대로 펼쳐 둔다
  const collapseWhenEmpty = (content: ReactNode) =>
    isLibraryEmpty ? (
      <details className='group rounded-2xl border border-line-soft bg-card'>
        <summary className='flex cursor-pointer list-none items-center gap-1.5 px-5 py-4 text-sm text-text-body hover:text-text-strong [&::-webkit-details-marker]:hidden'>
          <ChevronDown
            aria-hidden='true'
            className='size-4 transition-transform group-open:rotate-180'
          />
          책을 기록하면 채워질 통계 미리 보기
        </summary>
        <div className='space-y-6 border-t border-line-soft p-5'>{content}</div>
      </details>
    ) : (
      content
    );

  /*
    올해 요약 카드. 기록이 없으면 통계와 함께 접어 두지만, **그 해 목표를 정해 뒀으면 꺼내 둔다.**
    목표를 정한 직후 서재가 비어 있다는 이유로 목표가 접힌 상자 속에 숨으면
    "저장이 안 됐나?"로 읽힌다. 0권 카드는 한 줄로 낮게 접히고(data-compact)
    "올해 목표 N권, 첫 책부터 시작해요"라고 말하므로 빈 성적표가 되지 않는다.
  */
  const yearSummary = (
    <YearSummary
      year={selectedYear}
      today={today}
      completed={stats.totalCompletedBooks}
      target={goalTarget}
      totalPages={stats.totalPages}
      averageRating={stats.averageRating}
      lifeBookCount={stats.lifeBookCount}
      monthlyReading={stats.monthlyReading}
      isOwner={isOwner}
      onSetGoal={
        onSetGoal && selectedYear === currentYear ? onSetGoal : undefined
      }
      goalShare={
        // 자랑은 주인이 한다. 이미지는 올해 목표만 그린다(goal-story 라우트)
        isOwner && username && selectedYear === currentYear ? (
          <ShareSheetButton
            path={`/${username}`}
            imagePath={`/${username}/goal-story`}
            fileName={`page0127-${username}-goal.png`}
            title={`${currentYear} 독서 목표 달성`}
            sheetTitle='목표 달성 공유하기'
            triggerLabel='달성 공유하기'
            loadingMessages={GOAL_STORY_LOADING}
          />
        ) : undefined
      }
    />
  );

  // 책장 제목은 지금 보는 범위를 그대로 말한다
  const shelfTitle = isAllView ? allShelfTitle : `${selectedYear}년 서재`;

  const bookShelf = (
    <div className='space-y-6 py-6'>
      {/* 읽는 중은 필터와 무관하게 항상 앞세운다 → 필터 dimming 밖에 둔다 */}
      <ReadingNowStrip
        books={readingBooks}
        bookHref={bookHref}
        nudgeToday={isOwner ? today : undefined}
      />

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
          selectedCategories={selectedCategories}
          selectedRating={selectedRating}
          searchQuery={searchQuery}
          onCategoriesChange={filters.setCategories}
          onRemoveRatingFilter={filters.clearRating}
          onSearchChange={filters.setSearch}
          onResetAll={filters.resetAll}
          // 책장형은 PublicBookShelf가 username으로 직접 링크를 계산하지만,
          // 피드형(BookFeedGrid)은 DashboardBookList 내부에서 렌더링되므로
          // bookHref를 통해 공개 서재/내 서재 링크를 구분해 넘겨야 한다
          bookHref={bookHref}
          renderBooks={(filteredBooks, { groupByCategory }) =>
            isAllView ? (
              // 전체 보기는 한 책장에 이어 꽂는다 — 분야순이면 경계마다 북엔드(HJ, 2026-11-24).
              // 예전엔 분야마다 선반을 새로 시작해 반쯤 빈 줄이 여럿 생겼다
              <PublicBookShelf
                books={filteredBooks}
                username={username}
                groupBy={groupByCategory ? bookendCategory : undefined}
                compact
              />
            ) : (
              <PublicBookShelf
                books={filteredBooks}
                groupBy={groupByCategory ? bookendCategory : undefined}
                // 조건이 걸리면 읽는 중 책을 덧붙이지 않는다 — 조건을 거치지 않은 책이 섞인다
                readingBooks={hasActiveShelfFilter(filters) ? [] : readingBooks}
                plateLabel={String(selectedYear)}
                username={username}
                // 다음 책 자리 — 주인이 올해 책장을 조건 없이 볼 때만.
                // 지난해 책장에 "추가" 칸이 있으면 어색하고, 조건을 걸면 걸러진 목록이라 끝칸이 아니다
                trailingSlot={
                  isOwner &&
                  selectedYear === currentYear &&
                  !hasActiveShelfFilter(filters) ? (
                    <NextBookSlot />
                  ) : undefined
                }
                compact
              />
            )
          }
        />
      </section>
    </div>
  );

  // 달마다 완독 권수 — 기록 묶음의 월별 완독 막대로 그린다
  const monthlyCounts = Array.from(
    { length: 12 },
    (_, i) => stats.monthlyReading.find((m) => m.month === i + 1)?.count ?? 0
  );
  const calendarProps = {
    books: calendarBooks,
    sentenceDraws,
    year: selectedYear,
    today,
    isOwner,
    bookHref,
    todaySlot: calendarTodaySlot,
    footerSlot: calendarFooterSlot,
    summaryLinks: calendarSummaryLinks,
    sentenceMonthCounts,
  };
  // 빈 서재에서 오늘의 문장만 펼칠 때 쓰는 캘린더 — 월별 막대 없이 혼자 달을 들고 있다
  const calendar = <ReadingCalendar key={selectedYear} {...calendarProps} />;

  // 주인이 올해를 볼 때, 오늘의 문장을 아직 안 펼쳤으면 서재 묶음 맨 위에 배너.
  // 캘린더가 '기록' 묶음으로 내려가면서 매일 펼치는 입구가 묻히지 않게 남긴다.
  // 펼친 뒤에는 숨긴다 — 펼친 문장은 캘린더 오늘 칸에서 본다(HJ, 2026-11-12)
  const drewToday = sentenceDraws.some((draw) => draw.draw_date === today);
  const todayShortcut = calendarTodaySlot &&
    selectedYear === currentYear &&
    !drewToday && <TodaySentenceBanner today={today} />;

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
          goalYear={onSetGoal ? currentYear : undefined}
        />

        {isWishlistView ? (
          /* ── 읽고 싶어요(위시리스트) 뷰 ── 서재와 분리된 별도 목록 */
          <>
            <WishlistShelf books={wishlistBooks} bookHref={bookHref} />
            {badgeSlot}
          </>
        ) : isAllView ? (
          /* ── 전체(누적) 뷰 ── 연도 보기와 같은 서재·기록·취향 세 묶음(HJ, 2026-11-24).
             방문자의 첫 화면이 전체가 되면서 길이가 문제가 됐다 → 같은 바로가기 탭으로 오간다.
             서재 = 지금까지 무엇을 읽었나 / 기록 = 해마다 얼마나 / 취향 = 어떤 독자인가 */
          <div className='space-y-6'>
            {emptyNotice}

            {isLibraryEmpty ? (
              // 빈 서재 — 묶음·탭 없이 예전처럼 "통계 미리 보기" 하나로 접는다(연도 보기와 같은 규칙)
              <>
                {collapseWhenEmpty(
                  <>
                    <ReadingJourneyCard data={overallStats.journey} />
                    <YearlyTrendChart data={overallStats.yearlyTrend} />
                    {bookShelf}
                  </>
                )}
                {badgeSlot}
              </>
            ) : (
              <>
                <LibrarySectionNav />

                <LibraryGroup id='library-shelf' title='서재'>
                  <Card className='rounded-2xl bg-card py-6 shadow-none'>
                    <CardHeader>
                      <CardTitle>지금까지의 기록</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <ReadingJourneyCard data={overallStats.journey} />
                    </CardContent>
                  </Card>

                  {/* 인생책은 따로 칸을 두지 않는다 — 책장 표지에 왕관을 씌운다(HJ, 2026-11-24).
                      칸과 책장에 같은 표지가 두 번씩 늘어났다 */}
                  {bookShelf}
                </LibraryGroup>

                <LibraryGroup id='library-record' title='기록'>
                  <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
                    <Card className='rounded-2xl bg-card py-6 shadow-none'>
                      <CardHeader className='pb-4'>
                        <CardTitle>연도별 완독 추이</CardTitle>
                        <p className='text-sm text-muted-foreground'>
                          올해를 강조해 연도별 완독 권수를 비교합니다
                        </p>
                      </CardHeader>
                      <CardContent className='pb-6'>
                        <RenderWhenNear placeholder={<TrendChartSkeleton />}>
                          <YearlyTrendChart
                            data={overallStats.yearlyTrend}
                            // 목표는 주인에게만 — 방문자 차트는 완독 권수만(HJ, 2026-11-24)
                            goals={isOwner ? readingGoals : undefined}
                          />
                        </RenderWhenNear>
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
                </LibraryGroup>

                <LibraryGroup id='library-taste' title='취향'>
                  {/* 연도 탭과 같은 균형 카드 — books 는 이미 재독 합침이다
                  (PublicLibraryContent 의 visibleBooks — 주인은 비공개 포함).
                  가린 비공개 책은 분야를 모른다 — 균형에서는 뺀다 */}
                  <ReadingBalanceCard
                    balance={calculateReadingBalance(
                      books.filter((book) => !book.is_masked)
                    )}
                  />
                  {badgeSlot}
                </LibraryGroup>
              </>
            )}
          </div>
        ) : /* ── 연도 뷰 ── 서재 · 기록 · 취향 세 묶음(HJ, 2026-11-11)
             서재 = 무엇을 읽고 있고 읽었나 / 기록 = 언제 읽었나 / 취향 = 어떤 독자인가.
             전부 펼쳐 두고, 위의 바로가기 탭으로 묶음 사이를 오간다(접지 않는다 — HJ) */
        isLibraryEmpty ? (
          <div className='space-y-6'>
            {emptyNotice}
            {/* 빈 서재여도 오늘의 문장은 펼칠 수 있어야 한다 — 접히는 영역 밖에 둔다 */}
            {calendarTodaySlot && selectedYear === currentYear && calendar}
            {isGoalPinned && yearSummary}
            {collapseWhenEmpty(
              <>
                {!isGoalPinned && yearSummary}
                {bookShelf}
                <RatingSummaryCard
                  year={selectedYear}
                  ratings={stats.ratingReading}
                  averageRating={stats.averageRating}
                  total={stats.totalCompletedBooks}
                  lifeBooks={[]}
                  bookHref={bookHref}
                  onRatingClick={handleRatingClick}
                />
                <ReadingBalanceCard
                  year={selectedYear}
                  balance={calculateReadingBalance(
                    balanceBooks.current,
                    balanceBooks.previous
                  )}
                />
              </>
            )}
            {badgeSlot}
          </div>
        ) : (
          <div className='space-y-6'>
            <LibrarySectionNav />

            <LibraryGroup id='library-shelf' title='서재'>
              {todayShortcut}
              {yearSummary}
              {bookShelf}
            </LibraryGroup>

            <LibraryGroup id='library-record' title='기록'>
              {/* 캘린더 + [월별 완독 | 평점 분포] — 막대를 누르면 캘린더가 그 달로(상태는 ReadingRecord) */}
              <ReadingRecord
                key={selectedYear}
                calendar={calendarProps}
                monthlyCounts={monthlyCounts}
                ratingCard={
                  <RatingSummaryCard
                    year={selectedYear}
                    ratings={stats.ratingReading}
                    averageRating={stats.averageRating}
                    total={stats.totalCompletedBooks}
                    lifeBooks={completedBooks.filter(
                      (book) => book.is_life_book
                    )}
                    bookHref={bookHref}
                    onRatingClick={handleRatingClick}
                  />
                }
              />
            </LibraryGroup>

            <LibraryGroup id='library-taste' title='취향'>
              <ReadingBalanceCard
                year={selectedYear}
                balance={calculateReadingBalance(
                  balanceBooks.current,
                  balanceBooks.previous
                )}
              />
              {badgeSlot}
            </LibraryGroup>
          </div>
        )}
      </section>
    </>
  );
};

type LibraryGroupProps = {
  id: string;
  title: string;
  children: ReactNode;
};

/** 서재·기록·취향 한 묶음 — 바로가기 탭이 id 로 내려온다(헤더+탭 줄만큼 띄워 멈춘다) */
const LibraryGroup = ({ id, title, children }: LibraryGroupProps) => (
  <section
    id={id}
    aria-labelledby={`${id}-heading`}
    className='scroll-mt-32 space-y-4'
  >
    <h2
      id={`${id}-heading`}
      className='pt-2 text-lg font-bold text-text-strong'
    >
      {title}
    </h2>
    <div className='space-y-6'>{children}</div>
  </section>
);
