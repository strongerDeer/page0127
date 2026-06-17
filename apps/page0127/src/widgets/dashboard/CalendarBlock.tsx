'use client';

import { useReducer } from 'react';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';

import {
  type CalendarData as ReadingCalendarData,
  ReadingCalendar,
} from '@/widgets/dashboard/ReadingCalendar';

/**
 * Calendar 영역 Client 래퍼
 *
 * 학습 포인트:
 * - DashboardContent에서 calendar 관련 상태/쿼리만 추출 → 단일 책임
 * - 서버에서 받은 initial 데이터는 useQuery의 initialData로 사용
 *   → 첫 렌더링 시 추가 fetch 없이 즉시 그려짐
 * - prev/next 버튼 클릭 시 queryKey가 바뀌면서 자동 fetch
 */

type CalendarSummary = {
  totalBooks: number;
  totalPages: number;
};

type CalendarBlockProps = {
  initialData: ReadingCalendarData[];
  initialSummary: CalendarSummary;
  initialYear: number;
  initialMonth: number;
};

// year/month를 한 액션으로 원자적 갱신 (12월→1월 경계에서 month + year 동시 변경)
type CalendarState = {
  calendarYear: number;
  calendarMonth: number;
};

type CalendarAction = { type: 'PREV_MONTH' } | { type: 'NEXT_MONTH' };

const calendarReducer = (
  state: CalendarState,
  action: CalendarAction
): CalendarState => {
  switch (action.type) {
    case 'PREV_MONTH':
      if (state.calendarMonth === 1) {
        return { calendarYear: state.calendarYear - 1, calendarMonth: 12 };
      }
      return { ...state, calendarMonth: state.calendarMonth - 1 };
    case 'NEXT_MONTH':
      if (state.calendarMonth === 12) {
        return { calendarYear: state.calendarYear + 1, calendarMonth: 1 };
      }
      return { ...state, calendarMonth: state.calendarMonth + 1 };
    default:
      return state;
  }
};

export const CalendarBlock = ({
  initialData,
  initialSummary,
  initialYear,
  initialMonth,
}: CalendarBlockProps) => {
  const [state, dispatch] = useReducer(calendarReducer, {
    calendarYear: initialYear,
    calendarMonth: initialMonth,
  });

  const { calendarYear, calendarMonth } = state;

  // 초기 연/월과 일치할 때만 initialData를 시드로 사용 → 그 외엔 fetch 발생
  const { data: result, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['calendar', calendarYear, calendarMonth],
    queryFn: async () => {
      // 쿼리스트링은 axios params 옵션으로 전달
      const { data: json } = await apiClient.get<{
        success: boolean;
        data: ReadingCalendarData[];
        summary: CalendarSummary;
      }>('/books/calendar', {
        params: { year: calendarYear, month: calendarMonth },
      });
      if (!json.success) throw new Error('캘린더 데이터 조회 실패');
      // success 플래그는 제외하고 데이터만 반환 (initialData 타입과 일치)
      return { data: json.data, summary: json.summary };
    },
    initialData:
      calendarYear === initialYear && calendarMonth === initialMonth
        ? { data: initialData, summary: initialSummary }
        : undefined,
    // 월 이동(queryKey 변경) 시 새 달이 로딩되는 동안 이전 달 데이터를 유지
    // → 캘린더가 빈 화면으로 깜빡이지 않음. isPlaceholderData로 "로딩 중" 흐림 표시.
    placeholderData: keepPreviousData,
  });

  return (
    <div
      className='rounded-lg border border-border bg-card overflow-hidden'
      style={{
        opacity: isPlaceholderData ? 0.6 : 1, // 새 달 로딩 중 이전 달을 흐리게 유지
        transition: 'opacity 0.15s',
      }}
    >
      <ReadingCalendar
        data={result?.data ?? []}
        summary={result?.summary ?? { totalBooks: 0, totalPages: 0 }}
        currentYear={calendarYear}
        currentMonth={calendarMonth}
        isLoading={isLoading}
        onPreviousMonth={() => dispatch({ type: 'PREV_MONTH' })}
        onNextMonth={() => dispatch({ type: 'NEXT_MONTH' })}
      />
    </div>
  );
};
