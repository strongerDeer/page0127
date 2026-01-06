'use client';

import { useState } from 'react';

import { BookOpen, FileText, Star, Trophy, Calendar } from 'lucide-react';

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

import { PublicBookShelf } from './PublicBookShelf';
import { PublicLibraryHeader } from './PublicLibraryHeader';

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

  // 필터 상태 관리 (차트 클릭용) - 향후 구현 예정
  const [_selectedMonth, _setSelectedMonth] = useState<number | null>(null);
  const [_selectedRating, _setSelectedRating] = useState<number | null>(null);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* 프로필 헤더 */}
        <PublicLibraryHeader
          profile={profile}
          username={username}
          isOwnProfile={isOwnProfile}
          currentUserId={currentUserId}
        />

        {/* 연도별 통계 */}
        <div className="flex items-center justify-between rounded-2xl border-2 border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-2xl">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-slate-700" />
            <h2 className="text-2xl font-bold text-slate-800">{selectedYear}년 독서 기록</h2>
          </div>

          {/* 연도 선택 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">연도 선택:</span>
            <Select
              value={selectedYear.toString()}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="w-[140px] border-white/60 bg-white/50 backdrop-blur-md shadow-sm">
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

        {/* 독서 목표 진행률 (공개 서재 - 읽기 전용) */}
        {isCurrentYearGoal && readingGoal && (
          <div className="rounded-3xl border-2 border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-2xl">
             <h3 className="mb-4 text-lg font-bold text-slate-800">목표 달성 현황</h3>
             <ReadingGoalProgress
              year={selectedYear}
              target={readingGoal.target}
              current={completedBooksInYear}
            />
          </div>
        )}

        {/* 통계 요약 카드 (Glass Pills) */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<BookOpen className="h-5 w-5" />}
            title="읽은 책"
            value={stats.totalCompletedBooks}
            unit="권"
            variant="blue"
          />
          <StatCard
            icon={<FileText className="h-5 w-5" />}
            title="읽은 페이지"
            value={stats.totalPages}
            unit="쪽"
            variant="sky"
          />
          <StatCard
            icon={<Star className="h-5 w-5" />}
            title="평균 평점"
            value={stats.averageRating.toFixed(1)}
            unit="점"
            variant="indigo"
          />
          <StatCard
            icon={<Trophy className="h-5 w-5" />}
            title="인생 책"
            value={stats.fiveStarBooks}
            unit="권"
            description="5점 만점 도서"
            variant="cyan"
          />
        </div>

        {/* 차트 섹션 */}
        <div className="rounded-3xl border-2 border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-2xl">
           <h3 className="mb-6 text-xl font-bold text-slate-800">독서 분석</h3>
           <DashboardCharts
            monthlyReading={stats.monthlyReading}
            categoryReading={stats.categoryReading}
            ratingReading={stats.ratingReading}
            averageRating={stats.averageRating}
            onMonthClick={handleMonthClick}
            onRatingClick={handleRatingClick}
          />
        </div>

        {/* 읽은 책 목록 & 책장 */}
        <div className="mt-8 rounded-3xl border-2 border-white/60 bg-white/40 p-8 shadow-sm backdrop-blur-2xl">
           <PublicBookShelf books={books} username={username} />
        </div>
      </div>
    </div>
  );
};
