/**
 * useMarkAsRead Hook
 * 알림 읽음 처리 Mutation 훅
 *
 * 학습 포인트:
 * - 낙관적 업데이트: 서버 응답을 기다리지 않고 화면을 먼저 바꾼다.
 *   예전에는 (1) PATCH 왕복 → (2) 캐시 무효화 → (3) 목록·배지 재조회 왕복을
 *   모두 기다린 뒤에야 읽음 표시가 반영돼 체감이 1~2초씩 걸렸다.
 * - 실패하면 onError에서 스냅샷으로 되돌리고, onSettled에서 서버 값과 다시 맞춘다.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { markAllAsRead, markAsRead } from '../../api/notificationApi';
import { notificationKeys } from '../../model/queryKeys';
import {
  type NotificationCacheSnapshot,
  patchNotificationLists,
  patchUnreadCount,
  restoreNotificationCache,
  snapshotNotificationCache,
  wasUnread,
} from '../optimisticCache';

type Context = { snapshot: NotificationCacheSnapshot };

/**
 * 개별 알림 읽음 처리 훅
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAsRead,
    onMutate: async (notificationId: string): Promise<Context> => {
      // 진행 중이던 refetch 응답이 낙관적 값을 덮어쓰지 않게 취소한다
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const snapshot = snapshotNotificationCache(queryClient);
      const shouldDecrement = wasUnread(queryClient, notificationId);

      patchNotificationLists(queryClient, (n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      );

      // 이미 읽은 알림을 다시 눌렀다면 배지는 그대로 둔다
      if (shouldDecrement) {
        patchUnreadCount(queryClient, (count) => count - 1);
      }

      return { snapshot };
    },
    onError: (_error, _notificationId, context) => {
      if (context) restoreNotificationCache(queryClient, context.snapshot);
      toast.error('알림 읽음 처리에 실패했습니다.');
    },
    // 성공이든 실패든 마지막엔 서버 값으로 맞춘다
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * 전체 알림 읽음 처리 훅
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllAsRead,
    onMutate: async (): Promise<Context> => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const snapshot = snapshotNotificationCache(queryClient);

      patchNotificationLists(queryClient, (n) => ({ ...n, is_read: true }));
      patchUnreadCount(queryClient, () => 0);

      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      if (context) restoreNotificationCache(queryClient, context.snapshot);
      toast.error('알림 읽음 처리에 실패했습니다.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
