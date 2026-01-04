'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { StatCard } from '@/shared/ui/StatCard';

import { DashboardCharts } from '@/features/stats/ui/DashboardCharts';
import { ReadingGoalProgress } from '@/features/stats/ui/ReadingGoalProgress';

import { PublicLibraryHeader } from './PublicLibraryHeader';
import { PublicBookShelf } from './PublicBookShelf';

import type { Book } from '@/entities/book/types';
import type { BookStats } from '@/entities/book/types/stats';
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

  // 필터 상태 관리 (차트 클릭용)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  // 독서 목표 데이터
  const readingGoal = profile.reading_goal;
  const isCurrentYearGoal = readingGoal?.year === selectedYear;

  // 선택된 연도의 완독 권수 계산
  const completedBooksInYear = books.filter(
    (book) =>
      book.status === 'completed' &&
      book.completed_date &&
      new Date(book.completed_date).getFullYear() === selectedYear,
  ).length;

  // 차트 클릭 핸들러 (현재는 사용 안함, 나중에 필터링 구현 시 사용)
  const handleMonthClick = (_month: number) => {
    // TODO: 월별 필터링 구현
  };

  const handleRatingClick = (_rating: number) => {
    // TODO: 평점별 필터링 구현
  };

  // 연도 변경 핸들러
  const handleYearChange = (value: string) => {
    router.push(`/${username}?year=${value}`);
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* 프로필 헤더 */}
      <PublicLibraryHeader
        profile={profile}
        username={username}
        isOwnProfile={isOwnProfile}
        currentUserId={currentUserId}
      />

      {/* 연도별 통계 */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">📅 {selectedYear}년 통계</h2>

        {/* 연도 선택 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">연도 선택:</span>
          <Select
            value={selectedYear.toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="w-[150px]">
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

      {/* 독서 목표 진행률 (공개 서재는 표시만, 수정 불가) */}
      <div className="mb-8">
        <ReadingGoalProgress
          year={selectedYear}
          target={isCurrentYearGoal && readingGoal ? readingGoal.target : 0}
          current={completedBooksInYear}
          // onSetGoal을 전달하지 않음 → 공개 서재는 목표 설정/수정 불가
        />
      </div>

      {/* 통계 카드 그리드 */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon="📚"
          title="읽은 책"
          value={stats.totalCompletedBooks}
          unit="권"
        />
        <StatCard
          icon="📖"
          title="읽은 페이지"
          value={stats.totalPages}
          unit="쪽"
        />
        <StatCard
          icon="⭐"
          title="평균 평점"
          value={stats.averageRating.toFixed(1)}
          unit="점"
        />
        <StatCard
          icon="❤️"
          title="최고 평점"
          value={stats.fiveStarBooks}
          unit="권"
        />
      </div>

      {/* 차트 섹션 */}
      <DashboardCharts
        monthlyReading={stats.monthlyReading}
        categoryReading={stats.categoryReading}
        ratingReading={stats.ratingReading}
        averageRating={stats.averageRating}
        onMonthClick={handleMonthClick}
        onRatingClick={handleRatingClick}
      />

      {/* 읽은 책 목록 (카드 그리드) */}
      <div className="mt-8">
        <PublicBookShelf books={books} username={username} />
      </div>
    </div>
  );
};
