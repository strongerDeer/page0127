'use client';

import { type ComponentProps, type ReactNode, useState } from 'react';

import { getInitialCalendarMonth } from '@/entities/book';

import { MonthlyReadingCard } from './MonthlyReadingCard';
import { type CalendarView, ReadingCalendar } from './ReadingCalendar';

type ReadingRecordProps = {
  /** 캘린더에 그대로 넘길 것 — 연·월(view)은 여기서 들고 있으므로 빼고 받는다 */
  calendar: Omit<
    ComponentProps<typeof ReadingCalendar>,
    'view' | 'onViewChange' | 'initialMonth'
  >;
  /** 달마다 완독 권수 — 1월부터 12개 */
  monthlyCounts: readonly number[];
  /** 월별 완독 옆 칸 — 평점 분포 카드 */
  ratingCard: ReactNode;
};

/**
 * 기록 묶음 — 독서 캘린더 + [월별 완독 | 평점 분포].
 *
 * 캘린더와 월별 막대는 서로 형제라 "지금 보는 달"을 한쪽이 혼자 들고 있으면 다른 쪽이 바꿀 수 없다.
 * 그래서 그 상태를 둘의 가장 가까운 부모인 여기로 끌어올렸다(lifting state up).
 * 캘린더는 view/onViewChange 를 받는 제어 컴포넌트, 막대는 값을 보여 주고 고르기만 한다.
 * 연도 탭이 바뀌면 부모가 key 를 바꿔 이 컴포넌트를 새로 만든다(처음 달 다시 계산).
 */
export const ReadingRecord = ({
  calendar,
  monthlyCounts,
  ratingCard,
}: ReadingRecordProps) => {
  const { books, year, today } = calendar;
  const [view, setView] = useState<CalendarView>(() => ({
    year,
    month: getInitialCalendarMonth(books, year, today),
  }));

  const thisMonth = today.startsWith(`${year}-`)
    ? Number(today.slice(5, 7))
    : undefined;

  const handleSelectMonth = (month: number) => {
    setView({ year, month });
    // 막대는 캘린더 아래에 있다 → 캘린더 머리가 화면 위로 지나갔으면 끌어올려 바뀐 달을 보여 준다
    const target = document.getElementById('reading-calendar');
    if (target && target.getBoundingClientRect().top < 0) {
      const reduce = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      target.scrollIntoView({
        behavior: reduce ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <>
      <ReadingCalendar {...calendar} view={view} onViewChange={setView} />
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <MonthlyReadingCard
          year={year}
          counts={monthlyCounts}
          // 캘린더가 ◀ 로 지난해까지 넘어가면 이 해 막대는 아무것도 고르지 않은 상태
          selectedMonth={view.year === year ? view.month : undefined}
          thisMonth={thisMonth}
          onSelect={handleSelectMonth}
        />
        {ratingCard}
      </div>
    </>
  );
};
