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
      <Card
        key={`calendar-${currentYear}-${currentMonth}`}
        className='rounded-2xl bg-card py-5 shadow-none'
      >
        <CardHeader className='px-5'>
          <CardTitle className='flex items-center justify-between'>
            <span>독서 캘린더</span>
            <div className='flex items-center gap-1'>
              <Button
                variant='outline'
                size='icon-sm'
                className='shadow-none'
                onClick={onPreviousMonth}
                aria-label='이전 달'
              >
                <ChevronLeft className='h-4 w-4' />
              </Button>
              <span className='min-w-[86px] text-center text-sm font-medium text-text-body'>
                {currentYear}년 {currentMonth}월
              </span>
              <Button
                variant='outline'
                size='icon-sm'
                className='shadow-none'
                onClick={onNextMonth}
                aria-label='다음 달'
              >
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className='px-5'>
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
              {/* 요일 헤더 — 색도 토큰만: 일=포인트(코랄), 토=브랜드 블루 */}
              <div className='mb-1 grid grid-cols-7 gap-1 text-center text-[13px] font-medium text-text-subtle'>
                {weekDays.map((day, index) => (
                  <div
                    key={day}
                    className={
                      index === 0
                        ? 'text-rank-up'
                        : index === 6
                          ? 'text-primary'
                          : ''
                    }
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* 날짜 그리드 — aspect-square는 넓은 컨테이너에서 셀을
                  정사각 150px까지 키워 달력이 화면을 다 먹었다 → 높이 고정 */}
              <div className='grid grid-cols-7 gap-1'>
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className='h-9' />;
                  }

                  const dateString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const books = booksByDateMap.get(dateString);
                  const bookCount = books?.length || 0;

                  return (
                    <button
                      key={day}
                      onClick={() => handleDateClick(day)}
                      disabled={bookCount === 0}
                      className={`relative h-9 rounded-md pt-1 text-xs transition-colors ${
                        bookCount > 0
                          ? 'cursor-pointer bg-accent/60 font-medium text-text-strong hover:bg-accent'
                          : 'cursor-default text-text-faint'
                      }`}
                    >
                      <span>{day}</span>
                      {/* 완독 권수만큼 점 (최대 3개) */}
                      {bookCount > 0 && (
                        <span className='absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5'>
                          {Array.from({
                            length: Math.min(bookCount, 3),
                          }).map((_, i) => (
                            <span
                              key={i}
                              className='size-1 rounded-full bg-primary'
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* 통계 요약 - 로딩 중이든 아니든 항상 표시 */}
          <div className='mt-4 text-left text-xs text-text-subtle'>
            이번 달{' '}
            <span className='font-semibold text-text-strong'>
              {summary.totalBooks}권
            </span>{' '}
            완독
            {summary.totalPages > 0 && (
              <>
                {' '}
                ·{' '}
                <span className='font-semibold text-text-strong'>
                  {summary.totalPages.toLocaleString()}쪽
                </span>
              </>
            )}
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
          <div className='divide-y divide-line-soft'>
            {selectedDate?.books.map((book) => (
              <div key={book.id} className='flex items-center gap-3 py-3'>
                {/* next/image는 width/height가 필수 — 없으면 런타임 에러가 난다 */}
                {book.cover && (
                  <Image
                    src={book.cover}
                    alt=''
                    width={44}
                    height={64}
                    className='book-cover h-16 w-auto shrink-0'
                  />
                )}
                <div className='min-w-0 flex-1'>
                  <h4 className='truncate text-sm font-medium text-text-strong'>
                    {book.title}
                  </h4>
                  <p className='truncate text-[13px] text-text-subtle'>
                    {book.author}
                  </p>
                </div>
                {book.rating > 0 && (
                  <span className='shrink-0 text-sm font-medium text-text-body'>
                    {book.rating}점
                  </span>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
