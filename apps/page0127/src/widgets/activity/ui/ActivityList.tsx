'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { QueryErrorState } from '@/shared/ui/QueryErrorState';

import { VirtualActivityRows } from './VirtualActivityRows';

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
 * 카드는 VirtualActivityRows 가 화면 근처 것만 그린다 — 1,000개를 내려도 DOM 은 수십 장 분량.
 */
export const ActivityList = ({
  queryKey,
  queryFn,
  emptyState,
  hideBook,
  initialCommentsOpen,
}: ActivityListProps) => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    isFetchNextPageError,
    isFetching,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 0 }) =>
      queryFn({ limit: PAGE_SIZE, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.flat().length,
    initialPageParam: 0,
  });

  // 가상 목록이 "끝 근처를 그렸다"고 알려 줄 때 부른다
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError)
      fetchNextPage();
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }

  const activities = data?.pages.flat() || [];
  const errorState = isError ? (
    <QueryErrorState
      message='독서 기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
      onRetry={() => void (isFetchNextPageError ? fetchNextPage() : refetch())}
      isRetrying={isFetching}
    />
  ) : null;

  if (activities.length === 0) {
    return <>{errorState ?? emptyState ?? null}</>;
  }

  return (
    <div>
      <VirtualActivityRows
        activities={activities}
        hideBook={hideBook}
        initialCommentsOpen={initialCommentsOpen}
        onReachEnd={loadMore}
      />
      {errorState}
      <div className='py-4'>
        {isFetchingNextPage && (
          <div className='flex items-center justify-center'>
            <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
          </div>
        )}
      </div>
      {!isError && !hasNextPage && activities.length > 0 && (
        <p className='py-4 text-center text-sm text-muted-foreground'>
          모든 활동을 불러왔습니다
        </p>
      )}
    </div>
  );
};
