'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { activityApi } from '@/entities/activity';

import { ActivityCard } from './ActivityCard';

/**
 * 활동 피드 컴포넌트
 *
 * 학습 포인트:
 * - useInfiniteQuery로 무한 스크롤 구현
 * - Intersection Observer로 자동 로딩
 * - 페이지네이션 처리 (offset 기반)
 */
export const ActivityFeed = () => {
  const observerRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['feed', 'activities'],
    queryFn: ({ pageParam = 0 }) =>
      activityApi.getFeed({ limit: 20, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      // 마지막 페이지가 20개 미만이면 더 이상 페이지 없음
      if (lastPage.length < 20) return undefined;
      // 다음 offset 계산
      return allPages.flat().length;
    },
    initialPageParam: 0,
  });

  // Intersection Observer로 무한 스크롤 구현
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Loader2 className='h-8 w-8 animate-spin text-gray-400' />
      </div>
    );
  }

  const activities = data?.pages.flat() || [];

  // 활동 없음
  if (activities.length === 0) {
    return (
      <div className='rounded-lg border border-gray-200 bg-gray-50 py-12 text-center'>
        <p className='text-gray-600'>아직 활동이 없습니다</p>
        <p className='mt-2 text-sm text-gray-500'>
          친구를 팔로우하고 그들의 독서 활동을 확인해보세요
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* 활동 목록 */}
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}

      {/* 무한 스크롤 트리거 */}
      <div ref={observerRef} className='py-4'>
        {isFetchingNextPage && (
          <div className='flex items-center justify-center'>
            <Loader2 className='h-6 w-6 animate-spin text-gray-400' />
          </div>
        )}
      </div>

      {/* 더 이상 로드할 활동 없음 */}
      {!hasNextPage && activities.length > 0 && (
        <p className='py-4 text-center text-sm text-gray-500'>
          모든 활동을 불러왔습니다
        </p>
      )}
    </div>
  );
};
