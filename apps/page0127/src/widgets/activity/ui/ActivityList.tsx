'use client';

import { useEffect, useEffectEvent, useRef } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { ActivityCard } from './ActivityCard';

import type { Activity } from '@/entities/activity';

type ActivityListProps = {
  queryKey: readonly unknown[];
  queryFn: (params: { limit: number; offset: number }) => Promise<Activity[]>;
  emptyState?: React.ReactNode;
  hideBook?: boolean;
  initialCommentsOpen?: boolean; // 각 카드의 댓글을 기본 펼침으로 (책 타임라인용)
};

const PAGE_SIZE = 20;

/**
 * 활동 목록(무한 스크롤) 공용 컴포넌트.
 * 학습 포인트: 데이터 소스(queryKey/queryFn)를 주입받아 피드·책 타임라인이 재사용한다.
 */
export const ActivityList = ({
  queryKey,
  queryFn,
  emptyState,
  hideBook,
  initialCommentsOpen,
}: ActivityListProps) => {
  const observerRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam = 0 }) =>
        queryFn({ limit: PAGE_SIZE, offset: pageParam }),
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length < PAGE_SIZE ? undefined : allPages.flat().length,
      initialPageParam: 0,
    });

  const onIntersect = useEffectEvent(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onIntersect();
      },
      { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasNextPage]);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }

  const activities = data?.pages.flat() || [];

  if (activities.length === 0) {
    return <>{emptyState ?? null}</>;
  }

  return (
    <div>
      <div className='divide-y divide-line-soft border-t border-line'>
        {activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            hideBook={hideBook}
            initialCommentsOpen={initialCommentsOpen}
          />
        ))}
      </div>
      <div ref={observerRef} className='py-4'>
        {isFetchingNextPage && (
          <div className='flex items-center justify-center'>
            <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
          </div>
        )}
      </div>
      {!hasNextPage && activities.length > 0 && (
        <p className='py-4 text-center text-sm text-muted-foreground'>
          모든 활동을 불러왔습니다
        </p>
      )}
    </div>
  );
};
