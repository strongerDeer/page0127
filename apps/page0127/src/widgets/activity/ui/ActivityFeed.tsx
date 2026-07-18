'use client';

import { useEffect, useEffectEvent, useRef } from 'react';

import Link from 'next/link';

import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { activityApi, activityKeys } from '@/entities/activity';

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
    queryKey: activityKeys.feeds(),
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

  // useEffectEvent: 교차 시점에 실행할 콜백을 분리한다.
  // fetchNextPage·isFetchingNextPage는 자주 바뀌는데, 이걸 deps에 두면 값이
  // 바뀔 때마다 observer가 disconnect→재생성됐다. effect event로 빼면 항상
  // 최신 값을 읽으면서도 재생성을 막는다.
  const onIntersect = useEffectEvent(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  });

  // Intersection Observer로 무한 스크롤 구현
  // deps에 hasNextPage만 남긴 이유: 초기 로딩이 끝나 목록(과 트리거 엘리먼트)이
  // 마운트되는 시점에 observer를 연결해야 하기 때문이다.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onIntersect();
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage]);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }

  const activities = data?.pages.flat() || [];

  // 활동 없음 — 빈 화면은 다음 행동을 안내한다
  if (activities.length === 0) {
    return (
      <div className='rounded-2xl bg-sunken py-14 text-center'>
        <p className='text-text-body'>
          팔로우한 사람이 책을 읽으면 여기에 쌓입니다.
        </p>
        <Link
          href='/search'
          className='mt-3 inline-block text-sm font-medium text-primary hover:underline'
        >
          함께 읽는 사람 찾아보기
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* 활동 목록 — 카드 나열 대신 구분선 리스트 */}
      <div className='divide-y divide-line-soft border-t border-line'>
        {activities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </div>

      {/* 무한 스크롤 트리거 */}
      <div ref={observerRef} className='py-4'>
        {isFetchingNextPage && (
          <div className='flex items-center justify-center'>
            <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
          </div>
        )}
      </div>

      {/* 더 이상 로드할 활동 없음 */}
      {!hasNextPage && activities.length > 0 && (
        <p className='py-4 text-center text-sm text-muted-foreground'>
          모든 활동을 불러왔습니다
        </p>
      )}
    </div>
  );
};
