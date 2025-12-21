'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

import { DashboardBookList } from './DashboardBookList';
import { DashboardCharts } from './DashboardCharts';
import { ReadingGoalProgress } from './ReadingGoalProgress';

import { ReadingGoalDialog } from '@/features/profile/ui/ReadingGoalDialog';

import { CategoryPieChart } from '@/widgets/dashboard/CategoryPieChart';
import { RatingDistributionChart } from '@/widgets/dashboard/RatingDistributionChart';
import { ReadingJourneyCard } from '@/widgets/dashboard/ReadingJourneyCard';
import { YearlyTrendChart } from '@/widgets/dashboard/YearlyTrendChart';

import type { Book } from '@/entities/book/types';
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
}: DashboardContentProps) => {
  const router = useRouter();

  // 필터 상태 관리
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  // 검색 상태 관리
  const [searchQuery, setSearchQuery] = useState('');

  // 독서 목표 다이얼로그 상태
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);

  // 독서 목표 데이터
  const readingGoal = profile?.reading_goal;
  const isCurrentYearGoal = readingGoal?.year === selectedYear;

  // 선택된 연도의 완독 권수 계산
  const completedBooksInYear = books.filter(
    (book) =>
      book.status === 'completed' &&
      book.completed_date &&
      new Date(book.completed_date).getFullYear() === selectedYear
  ).length;

  // 월 필터 클릭 핸들러 (토글 방식: 같은 월 클릭 시 필터 해제)
  const handleMonthClick = (month: number) => {
    setSelectedMonth((prev) => (prev === month ? null : month));
  };

  // 월 필터 제거 핸들러
  const handleRemoveMonthFilter = () => {
    setSelectedMonth(null);
  };

  // 평점 필터 클릭 핸들러 (토글 방식)
  const handleRatingClick = (rating: number) => {
    setSelectedRating((prev) => (prev === rating ? null : rating));
  };

  // 평점 필터 제거 핸들러
  const handleRemoveRatingFilter = () => {
    setSelectedRating(null);
  };

  // 연도 변경 핸들러
  const handleYearChange = (value: string) => {
    router.push(`/dashboard?year=${value}`);
  };

  // 공개 서재 URL 복사
  const handleCopyPublicUrl = () => {
    if (!profile?.username) return;

    const publicUrl = `${window.location.origin}/${profile.username}`;
    navigator.clipboard.writeText(publicUrl);
    alert('공개 서재 URL이 복사되었습니다!');
  };

  return (
    <div className='min-h-screen bg-gray-50 p-8'>
      <div className='mx-auto max-w-6xl'>
        <div className='mb-6 flex items-start justify-between'>
          <div>
            <h1 className='text-3xl font-bold'>내 서재</h1>
            <p className='text-gray-600'>당신의 독서 여정을 확인하세요</p>
          </div>

          {/* 공개 서재 URL */}
          {profile?.username && (
            <div className='flex flex-col items-end gap-2'>
              <p className='text-sm text-gray-500'>공개 서재 주소</p>
              <div className='flex gap-2'>
                <Link
                  href={`/${profile.username}`}
                  target='_blank'
                  className='rounded-md border bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50'
                >
                  /{profile.username}
                </Link>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleCopyPublicUrl}
                >
                  URL 복사
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ============ 전체 독서 통계 (All Time Stats) ============ */}
        <Card className='mb-8 border-2 border-emerald-100'>
          <CardHeader>
            <CardTitle className='text-xl'>📖 전체 독서 통계</CardTitle>
            <p className='text-sm text-gray-600'>전체 기간의 독서 히스토리</p>
          </CardHeader>
          <CardContent className='space-y-8'>
            {/* 1. 독서 여정 카드 */}
            <div>
              <h3 className='mb-4 text-lg font-semibold'>🏆 독서 여정</h3>
              <ReadingJourneyCard data={overallStats.journey} />
            </div>

            {/* 2. 카테고리 + 5년 트렌드 */}
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
              <div>
                <h3 className='mb-4 text-lg font-semibold'>📊 카테고리별 분포</h3>
                <CategoryPieChart data={overallStats.categoryDistribution} />
              </div>
              <div>
                <h3 className='mb-4 text-lg font-semibold'>📈 최근 5년 독서량</h3>
                <YearlyTrendChart data={overallStats.yearlyTrend} />
              </div>
            </div>

            {/* 3. 평점 분포 */}
            <div>
              <h3 className='mb-4 text-lg font-semibold'>⭐ 평점 분포 & 선호도</h3>
              <RatingDistributionChart data={overallStats.ratingDistribution} />
            </div>
          </CardContent>
        </Card>

        {/* ============ 연도별 통계 (선택된 연도) ============ */}
        <div className='mb-6 flex items-center justify-between'>
          <h2 className='text-2xl font-bold'>📅 {selectedYear}년 통계</h2>

          {/* 연도 선택 */}
          <div className='flex items-center gap-2'>
            <span className='text-sm text-gray-600'>연도 선택:</span>
            <Select
              value={selectedYear.toString()}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className='w-[150px]'>
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
          </div>
        </div>

        {/* 독서 목표 진행률 */}
        <div className='mb-8'>
          <ReadingGoalProgress
            year={selectedYear}
            target={isCurrentYearGoal && readingGoal ? readingGoal.target : 0}
            current={completedBooksInYear}
            onSetGoal={() => setIsGoalDialogOpen(true)}
          />
        </div>

        {/* 통계 카드 그리드 */}
        <div className='mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <StatCard
            icon='📚'
            title='총 읽은 책'
            value={stats.totalCompletedBooks}
            unit='권'
          />
          <StatCard
            icon='📖'
            title='총 읽은 쪽수'
            value={stats.totalPages}
            unit='쪽'
          />
          <StatCard
            icon='🎯'
            title='연간 목표'
            value={stats.yearlyGoal}
            unit='권'
          />
          <StatCard
            icon='✅'
            title='완독률'
            value={stats.completionRate}
            unit='%'
          />
        </div>

        {/* 차트 섹션 (클릭 시 아래 책 목록 필터링) */}
        <DashboardCharts
          monthlyReading={stats.monthlyReading}
          categoryReading={stats.categoryReading}
          ratingReading={stats.ratingReading}
          averageRating={stats.averageRating}
          onMonthClick={handleMonthClick}
          onRatingClick={handleRatingClick}
        />

        {/* 읽은 책 목록 (카테고리 + 월 + 평점 + 검색어 복합 필터) */}
        <Card className='mb-8'>
          <CardContent className='pt-6'>
            <DashboardBookList
              books={books}
              categories={stats.categoryReading}
              selectedMonth={selectedMonth}
              selectedCategory={selectedCategory}
              selectedRating={selectedRating}
              searchQuery={searchQuery}
              onCategoryChange={setSelectedCategory}
              onRemoveMonthFilter={handleRemoveMonthFilter}
              onRemoveRatingFilter={handleRemoveRatingFilter}
              onSearchChange={setSearchQuery}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>환영합니다!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='mb-2 text-gray-600'>
              <strong>이메일:</strong> {userEmail}
            </p>
            <p className='text-gray-600'>
              <strong>사용자 ID:</strong> {userId}
            </p>
            <div className='mt-6 rounded-lg bg-blue-50 p-4'>
              <p className='mb-4 text-sm text-blue-800'>
                📚 도서 검색 및 독서 기록 기능을 사용해보세요!
              </p>
              <div className='flex gap-3'>
                <Link href='/books'>
                  <Button variant='outline'>내 서재</Button>
                </Link>
                <Link href='/books/add'>
                  <Button>도서 추가</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 독서 목표 설정 다이얼로그 */}
      <ReadingGoalDialog
        isOpen={isGoalDialogOpen}
        onClose={() => setIsGoalDialogOpen(false)}
        userId={userId}
        currentYear={currentYear}
        currentGoal={readingGoal ?? null}
        onSuccess={() => {
          // 페이지 새로고침하여 업데이트된 프로필 반영
          router.refresh();
        }}
      />
    </div>
  );
};
