'use client';

import { useState } from 'react';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import { BookOpen, Calendar, FileText, Star, Trophy } from 'lucide-react';

import { PageContainer } from '@/shared/ui/PageContainer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { StatCard } from '@/shared/ui/StatCard';

import { DashboardBookList } from '@/features/stats/ui/DashboardBookList';
import { ReadingGoalProgress } from '@/features/stats/ui/ReadingGoalProgress';

// Recharts 차트 묶음 → 초기 번들에서 제외
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

import { PublicBookShelf } from './PublicBookShelf';
import { PublicLibraryHeader } from './PublicLibraryHeader';

import type { Book, BookStatus } from '@/entities/book';
import type { BookStats } from '@/entities/book';
import type { Profile } from '@/entities/profile/types';

type PublicLibraryContentProps = {
  profile: Profile;
  username: string;
  isOwnProfile: boolean;
  currentUserId?: string;
  books: Book[];
  stats: BookStats;
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
  availableYears,
  selectedYear,
}: PublicLibraryContentProps) => {
  const router = useRouter();

  // 책 목록 필터 상태
  const [statusFilter, setStatusFilter] = useState<BookStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const resetFilters = () => {
    setStatusFilter('all');
    setSearchQuery('');
    setSelectedCategory(null);
  };

  // 독서 목표 데이터
  const readingGoal = profile.reading_goal;
  const isCurrentYearGoal = readingGoal?.year === selectedYear;

  // 선택된 연도의 완독 권수 계산
  const completedBooksInYear = books.filter(
    (book) =>
      book.status === 'completed' &&
      book.completed_date &&
      new Date(book.completed_date).getFullYear() === selectedYear
  ).length;

  // 연도 변경 핸들러
  const handleYearChange = (value: string) => {
    router.push(`/${username}?year=${value}`);
  };

  return (
    // PageContainer: DashboardContent와 동일한 레이아웃 껍데기 재사용
    // bg 기본값: 공개 서재도 앱 전체 배경(토큰)을 그대로 사용 — 미니멀 통일
    // width="library"(6xl): 대시보드(wide 7xl)보다 좁게
    <PageContainer width='library' className='space-y-8'>
      {/* 프로필 헤더 */}
      <PublicLibraryHeader
        profile={profile}
        username={username}
        isOwnProfile={isOwnProfile}
        currentUserId={currentUserId}
      />

      {/* 연도별 통계 — 섹션 헤더 + 연도 컨트롤 */}
      <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-6 py-4'>
        <div className='flex items-center gap-2'>
          <Calendar className='h-5 w-5 text-text-subtle' />
          <h2 className='text-lg font-bold tracking-tight text-text-strong'>
            {selectedYear}년 독서 기록
          </h2>
        </div>

        {/* 연도 선택 — select 값이 곧 연도라 별도 라벨은 두지 않는다 */}
        <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
          <SelectTrigger className='w-30'>
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

      {/* 독서 목표 진행률 (공개 서재 - 읽기 전용) */}
      {isCurrentYearGoal && readingGoal && (
        <div className='rounded-xl border border-border bg-card p-6'>
          <h3 className='mb-4 text-lg font-bold tracking-tight text-text-strong'>
            목표 달성 현황
          </h3>
          <ReadingGoalProgress
            year={selectedYear}
            target={readingGoal.target}
            current={completedBooksInYear}
          />
        </div>
      )}

      {/* 통계 요약 카드 — 숫자는 잉크, 색은 차트가 담당 */}
      <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
        <StatCard
          icon={<BookOpen className='h-4 w-4' />}
          title='읽은 책'
          value={stats.totalCompletedBooks}
          unit='권'
        />
        <StatCard
          icon={<FileText className='h-4 w-4' />}
          title='읽은 페이지'
          value={stats.totalPages}
          unit='쪽'
        />
        <StatCard
          icon={<Star className='h-4 w-4' />}
          title='평균 평점'
          value={stats.averageRating.toFixed(1)}
          unit='점'
        />
        <StatCard
          icon={<Trophy className='h-4 w-4' />}
          title='인생 책'
          value={stats.fiveStarBooks}
          unit='권'
          description='5점 만점 도서'
        />
      </div>

      {/* 차트 섹션 */}
      <div className='rounded-xl border border-border bg-card p-6'>
        <h3 className='mb-4 text-lg font-bold tracking-tight text-text-strong'>
          독서 분석
        </h3>
        <DashboardCharts
          monthlyReading={stats.monthlyReading}
          categoryReading={stats.categoryReading}
          ratingReading={stats.ratingReading}
          averageRating={stats.averageRating}
          onMonthClick={() => {}}
          onRatingClick={() => {}}
        />
      </div>

      {/* 읽은 책 목록 */}
      <div className='rounded-xl border border-border bg-card p-6'>
        <DashboardBookList
          books={books}
          categories={stats.categoryReading}
          title='공개 도서 목록'
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onCategoryChange={setSelectedCategory}
          onSearchChange={setSearchQuery}
          onStatusChange={setStatusFilter}
          onResetAll={resetFilters}
          renderBooks={(filteredBooks) => (
            <PublicBookShelf books={filteredBooks} username={username} />
          )}
        />
      </div>
    </PageContainer>
  );
};
