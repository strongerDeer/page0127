'use client';

import { activityApi, activityKeys } from '@/entities/activity';

import { ActivityList } from '@/widgets/activity';

/**
 * 책 상세의 "이 책의 기록" — 그 책의 활동 타임라인.
 * 책 표지는 상단 상세에 이미 있으므로 hideBook으로 카드에선 숨긴다.
 */
export const BookActivitySection = ({ bookId }: { bookId: string }) => (
  <section className='mt-6'>
    <h2 className='heading-2 mb-3 text-text-strong'>이 책의 기록</h2>
    <ActivityList
      queryKey={activityKeys.bookActivities(bookId)}
      queryFn={(params) => activityApi.getBookActivities(bookId, params)}
      hideBook
      emptyState={
        <p className='rounded-2xl bg-sunken py-10 text-center text-text-body'>
          아직 이 책의 기록이 없어요.
        </p>
      }
    />
  </section>
);
