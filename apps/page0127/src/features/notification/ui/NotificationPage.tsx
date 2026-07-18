'use client';

/**
 * NotificationPage 컴포넌트
 * 알림 전체 목록 페이지
 *
 * 학습 포인트:
 * - 무한 스크롤
 * - 읽음/읽지 않음 필터
 * - 전체 읽음 처리
 */

import { useEffect, useEffectEvent, useRef } from 'react';

import { useRouter } from 'next/navigation';

import { useInfiniteQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { useLocalStorage } from '@/shared/lib/hooks/useLocalStorage';
import { Button } from '@/shared/ui/button';

import {
  notificationKeys,
  type NotificationWithActor,
  useDeleteNotification,
  useMarkAllAsRead,
  useMarkAsRead,
} from '@/entities/notification';
import { useCurrentUser } from '@/entities/user';

import { NotificationItem } from './NotificationItem';

export const NotificationPage = () => {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const observerRef = useRef<HTMLDivElement>(null);
  // 마지막 선택 필터 복원 — useLocalStorage로 SSR 안전하게 처리
  const [filter, setFilter] = useLocalStorage<'all' | 'unread'>(
    'notification-filter',
    'all'
  );

  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  // 무한 스크롤 쿼리
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: notificationKeys.infinite(filter),
      queryFn: async ({ pageParam = 0 }) => {
        const params = new URLSearchParams({
          limit: '20',
          offset: String(pageParam),
        });

        if (filter === 'unread') {
          params.append('is_read', 'false');
        }

        const { data } = await apiClient.get<NotificationWithActor[]>(
          `/notifications?${params.toString()}`
        );
        return data;
      },
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.length < 20) return undefined;
        return allPages.flat().length;
      },
      initialPageParam: 0,
      enabled: !!currentUser,
    });

  // useEffectEvent: 교차 시점 콜백을 분리한다.
  // fetchNextPage·isFetchingNextPage를 deps에 두면 값이 바뀔 때마다 observer가
  // 재생성된다. effect event로 빼면 최신 값을 읽으면서도 재생성을 막는다.
  const onIntersect = useEffectEvent(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  });

  // Intersection Observer로 무한 스크롤 구현
  // deps에 hasNextPage만 남긴 이유: 트리거 엘리먼트가 {hasNextPage && ...}로
  // 조건부 렌더되므로, 등장/사라짐에 맞춰 observer를 다시 연결해야 한다.
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

  const handleNotificationClick = async (
    notification: NotificationWithActor
  ) => {
    // 읽지 않은 알림이면 읽음 처리
    if (!notification.is_read) {
      await markAsReadMutation.mutateAsync(notification.id);
    }

    // 알림 타입별 페이지 이동
    if (notification.type === 'follow') {
      router.push(`/${notification.actor.username || notification.actor_id}`);
    } else if (notification.target_id) {
      router.push(`/feed/${notification.target_id}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsReadMutation.mutateAsync();
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotificationMutation.mutateAsync(notificationId);
  };

  const handleMarkAsReadSingle = async (notificationId: string) => {
    await markAsReadMutation.mutateAsync(notificationId);
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    );
  }

  const notifications = data?.pages.flat() || [];
  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div className='space-y-4'>
      {/* 필터 및 액션 */}
      <div className='flex items-center justify-between rounded-2xl bg-sunken p-4'>
        <div className='flex gap-2'>
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size='sm'
            onClick={() => setFilter('all')}
          >
            전체
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'ghost'}
            size='sm'
            onClick={() => setFilter('unread')}
          >
            읽지 않음
          </Button>
        </div>

        {hasUnread && (
          <Button
            variant='ghost'
            size='sm'
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
          >
            모두 읽음
          </Button>
        )}
      </div>

      {/* 알림 목록 */}
      {notifications.length === 0 ? (
        <div className='rounded-2xl bg-sunken py-12 text-center'>
          <p className='text-muted-foreground'>
            {filter === 'unread'
              ? '읽지 않은 알림이 없습니다'
              : '알림이 없습니다'}
          </p>
        </div>
      ) : (
        <div className='rounded-2xl bg-sunken'>
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={() => handleNotificationClick(notification)}
              onDelete={handleDelete}
              onMarkAsRead={handleMarkAsReadSingle}
            />
          ))}

          {/* 무한 스크롤 트리거 */}
          {hasNextPage && (
            <div ref={observerRef} className='flex justify-center py-4'>
              {isFetchingNextPage && (
                <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
