'use client';

import { getSeoulToday } from '@/entities/book';

import { YearSummary } from '@/features/stats/ui/YearSummary';
import { MyRecordBlock } from '@/features/story-my-record';

/**
 * 블로그 글 속 "올해 나는 어디쯤일까요" 칸 — 서재의 올해 요약 카드를 그대로 쓴다(HJ 2026-11-24 "서재랑 동일하게").
 *
 * 글 페이지 API(/api/books/this-year)는 완독 수·목표만 주므로 쪽수·평점 칸은 0 으로 넘겨
 * 카드가 알아서 숨기게 한다 → 큰 권수 + 지금 속도 한마디 + 목표 막대만 남는다.
 * 보는 사람 자신의 숫자라 isOwner(목표를 못 채워도 보여 줌). 목표 수정 버튼은 서재에서만.
 */
export const StoryMyRecord = () => (
  <MyRecordBlock
    renderRecord={(record) => (
      <YearSummary
        year={record.year}
        today={getSeoulToday()}
        completed={record.completed}
        target={record.goal ?? 0}
        totalPages={0}
        averageRating={0}
        lifeBookCount={0}
        monthlyReading={[]}
        isOwner
      />
    )}
  />
);
