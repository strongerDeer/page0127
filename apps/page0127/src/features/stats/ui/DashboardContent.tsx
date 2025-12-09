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

import type { Book } from '@/entities/book/types';
import type { BookStats } from '@/entities/book/types/stats';

type DashboardContentProps = {
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
  stats,
  books,
  userEmail,
  userId,
  availableYears,
  selectedYear,
}: DashboardContentProps) => {
  const router = useRouter();

  // 필터 상태 관리
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

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

  return (
    <div className='min-h-screen bg-gray-50 p-8'>
      <div className='mx-auto max-w-6xl'>
        <div className='mb-6 flex items-center justify-between'>
          <h1 className='text-3xl font-bold'>대시보드</h1>

          {/* 연도 선택 */}
          <div className='flex items-center gap-2'>
            <span className='text-sm text-gray-600'>통계 기간:</span>
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

        {/* 읽은 책 목록 (카테고리 + 월 + 평점 복합 필터) */}
        <Card className='mb-8'>
          <CardContent className='pt-6'>
            <DashboardBookList
              books={books}
              categories={stats.categoryReading}
              selectedMonth={selectedMonth}
              selectedCategory={selectedCategory}
              selectedRating={selectedRating}
              onCategoryChange={setSelectedCategory}
              onRemoveMonthFilter={handleRemoveMonthFilter}
              onRemoveRatingFilter={handleRemoveRatingFilter}
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
    </div>
  );
};
