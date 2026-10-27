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

import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  SegmentedControl,
  SegmentedControlItem,
  StatePanel,
} from '@repo/ui';
import { Spinner } from '@repo/ui';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { apiClient } from '@/shared/api/client';
import { useLocalStorage } from '@/shared/lib/hooks/useLocalStorage';
import { QueryErrorState } from '@/shared/ui/QueryErrorState';

import {
  notificationHref,
  notificationKeys,
  type NotificationWithActor,
  useDeleteNotification,
  useMarkAllAsRead,
  useMarkAsRead,
  useUnreadCount,
} from '@/entities/notification';
import { useCurrentUser } from '@/entities/user';

import {
  type BulkRequest,
  MAX_BULK_SELECTION,
} from '@/features/bulk-management/model/types';
import { useBulkAction } from '@/features/bulk-management/model/useBulkAction';
import { BulkConfirmDialog } from '@/features/bulk-management/ui/BulkConfirmDialog';

import { LiveReadingEnvelopeDialog } from './LiveReadingEnvelopeDialog';
import { NotificationItem } from './NotificationItem';

export const NotificationPage = ({
  initialEnvelopeId,
}: {
  initialEnvelopeId?: string;
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmation, setConfirmation] = useState<BulkRequest | null>(null);
  const bulk = useBulkAction('notifications');
  const chooseDelete = (action: 'delete_read' | 'delete_selected') => {
    bulk.clearError();
    setConfirmation({
      requestId: crypto.randomUUID(),
      action,
      ids: action === 'delete_selected' ? [...selected] : [],
      ...(action === 'delete_read' ? { before: new Date().toISOString() } : {}),
    });
  };
  const confirmDelete = async () => {
    if (!confirmation) return;
    const result = await bulk.run(confirmation);
    if (!result) return;
    setConfirmation(null);
    setSelected(new Set());
    setSelecting(false);
    toast.success(`${result.count}개 알림을 삭제했어요.`);
    // Offset pagination restarts after deletions; dropdown and badge refresh too.
    await queryClient.resetQueries({
      queryKey: [...notificationKeys.all, 'infinite'],
    });
    await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  };
  const toggleSelection = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_BULK_SELECTION) next.add(id);
      return next;
    });
  const { data: currentUser } = useCurrentUser();
  const { data: unreadCount } = useUnreadCount(currentUser?.id);
  const observerRef = useRef<HTMLDivElement>(null);
  const [envelope, setEnvelope] = useState<NotificationWithActor | null>(null);
  const [dismissedInitial, setDismissedInitial] = useState(false);
  const initialEnvelope = useQuery({
    queryKey: ['notification-envelope', currentUser?.id, initialEnvelopeId],
    queryFn: async () =>
      (
        await apiClient.get<NotificationWithActor[]>(
          `/notifications?envelope=${initialEnvelopeId}`
        )
      ).data[0] ?? null,
    enabled: Boolean(currentUser && initialEnvelopeId),
  });
  const selectedEnvelope =
    envelope ??
    (!dismissedInitial && initialEnvelope.data?.type === 'reading_nudge'
      ? initialEnvelope.data
      : null);
  const closeEnvelope = () => {
    setEnvelope(null);
    setDismissedInitial(true);
  };
  // 마지막 선택 필터 복원 — useLocalStorage로 SSR 안전하게 처리
  const [filter, setFilter] = useLocalStorage<'all' | 'unread'>(
    'notification-filter',
    'all'
  );

  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  // 무한 스크롤 쿼리
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
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
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

    // 알림 타입별 페이지 이동 — 갈 곳은 notificationHref 한 곳에서 정한다(푸시 클릭과 공유)
    const href = notificationHref(notification, notification.actor.username);
    if (href) router.push(href);
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
    return <Spinner label='알림을 불러오는 중' size='lg' className='py-12' />;
  }

  const notifications = data?.pages.flat() || [];
  const hasUnread =
    (unreadCount?.count ?? 0) > 0 || notifications.some((n) => !n.is_read);

  return (
    <div className='space-y-4'>
      {initialEnvelopeId && initialEnvelope.isError && (
        <QueryErrorState
          message='메시지를 불러오지 못했어요.'
          onRetry={() => void initialEnvelope.refetch()}
          isRetrying={initialEnvelope.isFetching}
        />
      )}
      {initialEnvelopeId &&
        initialEnvelope.isSuccess &&
        !initialEnvelope.data && (
          <p role='status' className='text-sm text-text-subtle'>
            삭제되었거나 볼 수 없는 메시지예요.
          </p>
        )}
      {/* 필터 및 액션 */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <SegmentedControl aria-label='알림 필터'>
          <SegmentedControlItem
            aria-pressed={filter === 'all'}
            onClick={() => {
              setSelected(new Set());
              setFilter('all');
            }}
          >
            전체
          </SegmentedControlItem>
          <SegmentedControlItem
            aria-pressed={filter === 'unread'}
            onClick={() => {
              setSelected(new Set());
              setFilter('unread');
            }}
          >
            읽지 않음
          </SegmentedControlItem>
        </SegmentedControl>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={bulk.pending || !notifications.length}
            onClick={() => {
              setSelecting((value) => !value);
              setSelected(new Set());
            }}
          >
            {selecting ? '선택 취소' : '선택'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon-sm'
                aria-label='알림 더보기'
                disabled={bulk.pending}
              >
                <MoreHorizontal aria-hidden='true' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                disabled={!hasUnread || markAllAsReadMutation.isPending}
                onSelect={() => void handleMarkAllAsRead()}
              >
                모두 읽음
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => chooseDelete('delete_read')}>
                읽은 알림 모두 삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {selecting && (
        <div
          role='group'
          aria-label='알림 선택 관리'
          className='flex flex-wrap items-center gap-2 rounded-xl border border-line-soft bg-card p-3'
        >
          <span role='status' className='mr-auto text-sm'>
            {selected.size}개 선택
          </span>
          <Button
            size='sm'
            variant='ghost'
            onClick={() =>
              setSelected(
                new Set(
                  notifications
                    .slice(0, MAX_BULK_SELECTION)
                    .map((item) => item.id)
                )
              )
            }
          >
            불러온 알림 모두 선택
          </Button>
          <Button
            size='sm'
            variant='ghost'
            disabled={!selected.size}
            onClick={() => setSelected(new Set())}
          >
            선택 해제
          </Button>
          <Button
            size='sm'
            variant='destructive'
            disabled={!selected.size || bulk.pending}
            onClick={() => chooseDelete('delete_selected')}
          >
            선택 삭제
          </Button>
          <p className='w-full text-xs text-text-subtle'>
            현재 불러온 알림에서 최대 500개까지 선택할 수 있어요.
          </p>
        </div>
      )}
      {/* 알림 목록 */}
      {isError && (
        <QueryErrorState
          message='알림을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
          onRetry={() =>
            void (isFetchNextPageError ? fetchNextPage() : refetch())
          }
          isRetrying={isFetching}
        />
      )}
      {notifications.length === 0 ? (
        !isError && (
          <StatePanel
            message={
              filter === 'unread'
                ? '읽지 않은 알림이 없습니다'
                : '알림이 없습니다'
            }
          />
        )
      ) : (
        <div className='overflow-hidden rounded-2xl border border-line-soft bg-card'>
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={() =>
                notification.type === 'reading_nudge'
                  ? setEnvelope(notification)
                  : handleNotificationClick(notification)
              }
              onDelete={selecting ? undefined : handleDelete}
              onMarkAsRead={selecting ? undefined : handleMarkAsReadSingle}
              selection={
                selecting
                  ? {
                      checked: selected.has(notification.id),
                      onChange: () => toggleSelection(notification.id),
                      disabled: bulk.pending,
                    }
                  : undefined
              }
            />
          ))}

          {/* 무한 스크롤 트리거 */}
          {hasNextPage && (
            <div ref={observerRef} className='flex justify-center py-4'>
              {isFetchingNextPage && <Spinner label='알림을 더 불러오는 중' />}
            </div>
          )}
        </div>
      )}
      <BulkConfirmDialog
        open={!!confirmation}
        title={
          confirmation?.action === 'delete_read'
            ? '읽은 알림을 모두 삭제할까요?'
            : `선택한 알림 ${confirmation?.ids.length ?? 0}개를 삭제할까요?`
        }
        description={
          confirmation?.action === 'delete_read'
            ? '불러오지 않은 읽은 알림도 삭제돼요. 읽지 않은 알림은 남아 있으며 삭제한 알림은 복구할 수 없어요.'
            : '선택한 알림만 삭제해요. 삭제한 알림은 복구할 수 없어요.'
        }
        actionLabel='삭제'
        destructive
        pending={bulk.pending}
        error={bulk.error}
        onClose={() => setConfirmation(null)}
        onConfirm={() => void confirmDelete()}
      />
      {selectedEnvelope && (
        <LiveReadingEnvelopeDialog
          key={selectedEnvelope.id}
          notification={selectedEnvelope}
          onClose={closeEnvelope}

          onRead={() =>
            selectedEnvelope.is_read
              ? undefined
              : markAsReadMutation.mutateAsync(selectedEnvelope.id)
          }
          onVisit={async (notification) => {
            await handleNotificationClick({ ...notification, is_read: true });
            closeEnvelope();
          }}
        />
      )}
    </div>
  );
};
