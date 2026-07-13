'use client';

import { useState } from 'react';

import Image from 'next/image';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

/**
 * 독서 캘린더 컴포넌트
 *
 * 학습 포인트:
 * - Client Component: 월 이동, 날짜 클릭 등 상호작용 필요
 * - Date 객체 활용: 월의 첫날/마지막날 계산
 * - Map 자료구조: 날짜별 책 그룹핑
 * - Dialog: 날짜 클릭 시 책 목록 표시
 *
 * @param data - API로부터 받은 월별 완독 책 데이터
 * @param initialYear - 초기 연도 (현재 연도)
 * @param initialMonth - 초기 월 (현재 월)
 */

type Book = {
  id: string;
  title: string;
  author: string;
  cover: string;
  rating: number;
};

export type CalendarData = {
  date: string;
  books: Book[];
};

type Props = {
  data: CalendarData[];
  summary: {
    totalBooks: number;
    totalPages: number;
  };
  currentYear: number;
  currentMonth: number;
  isLoading: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
};

export const ReadingCalendar = ({
  data,
  summary,
  currentYear,
  currentMonth,
  isLoading,
  onPreviousMonth,
  onNextMonth,
}: Props) => {
  const [selectedDate, setSelectedDate] = useState<CalendarData | null>(null);

  // 요일 배열
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  // props로 받은 데이터 사용
  const calendarData = data;
  // const calendarSummary = summary;

  // 해당 월의 첫날과 마지막날 계산
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0(일) ~ 6(토)

  // 날짜별 책 데이터를 Map으로 변환 (빠른 검색)
  const booksByDateMap = new Map<string, Book[]>();
  calendarData.forEach((item) => {
    booksByDateMap.set(item.date, item.books);
  });

  // 날짜 클릭 핸들러
  const handleDateClick = (day: number) => {
    const dateString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const books = booksByDateMap.get(dateString);
    if (books && books.length > 0) {
      setSelectedDate({ date: dateString, books });
    }
  };

  // 달력 렌더링을 위한 배열 생성 (앞쪽 빈칸 + 날짜들)
  const calendarDays = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null); // 빈칸
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <>
      <Card key={`calendar-${currentYear}-${currentMonth}`} className="border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <span>독서 캘린더</span>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='icon'
                onClick={onPreviousMonth}
                aria-label='이전 달'
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <span className='text-base font-normal'>
                {currentYear}년 {currentMonth}월
              </span>
              <Button
                variant='outline'
                size='icon'
                onClick={onNextMonth}
                aria-label='다음 달'
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='flex items-center justify-center py-20'>
              <div className='text-center'>
                <div className='text-sm text-text-subtle'>
                  달력을 불러오는 중이에요…
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* 요일 헤더 */}
              <div className='mb-2 grid grid-cols-7 gap-1 text-center text-sm font-semibold'>
                {weekDays.map((day, index) => (
                  <div
                    key={day}
                    className={
                      index === 0
                        ? 'text-red-500'
                        : index === 6
                          ? 'text-blue-500'
                          : ''
                    }
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* 날짜 그리드 */}
              <div className='grid grid-cols-7 gap-1'>
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return (
                      <div key={`empty-${index}`} className='aspect-square' />
                    );
                  }

                  const dateString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const books = booksByDateMap.get(dateString);
                  const bookCount = books?.length || 0;

                  return (
                    <button
                      key={day}
                      onClick={() => handleDateClick(day)}
                      disabled={bookCount === 0}
                      className={`
                    relative aspect-square rounded-md border p-1 text-sm
                    transition-colors
                    ${bookCount > 0 ? 'cursor-pointer hover:bg-accent' : 'cursor-default text-muted-foreground'}
                  `}
                    >
                      <span>{day}</span>
                      {/* 완독 책이 있으면 점 표시 */}
                      {bookCount > 0 && (
                        <div className='absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5'>
                          <div
                            className={`h-1.5 w-1.5 rounded-full ${
                              bookCount === 1
                                ? 'bg-primary'
                                : bookCount === 2
                                  ? 'bg-chart-3'
                                  : 'bg-chart-5'
                            }`}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* 통계 요약 - 로딩 중이든 아니든 항상 표시 */}
          <div className='mt-4 space-y-2 text-center text-sm'>
            <div className='text-muted-foreground'>
              이번 달{' '}
              <span className='font-semibold text-foreground'>
                {summary.totalBooks}권
              </span>{' '}
              완독
              {summary.totalPages > 0 && (
                <>
                  {' '}
                  ·{' '}
                  <span className='font-semibold text-foreground'>
                    {summary.totalPages.toLocaleString()}쪽
                  </span>
                </>
              )}
            </div>
            {/* 디버그 정보 */}
            <div className='text-xs text-destructive'>
              DEBUG: books={summary.totalBooks}권 | pages={summary.totalPages}쪽
              | year={currentYear} | month={currentMonth} | dataLen=
              {data.length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 날짜 클릭 시 책 목록 Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDate?.date &&
                new Date(selectedDate.date).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}{' '}
              완독한 책
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-3'>
            {selectedDate?.books.map((book) => (
              <div key={book.id} className='flex gap-3 rounded-lg border p-3'>
                {book.cover && (
                  <Image
                    src={book.cover}
                    alt={book.title}
                    className='h-20 w-14 rounded object-cover'
                  />
                )}
                <div className='flex-1'>
                  <h4 className='font-semibold'>{book.title}</h4>
                  <p className='text-sm text-muted-foreground'>{book.author}</p>
                  {book.rating > 0 && (
                    <div className='mt-1 text-sm'>{book.rating}점</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
