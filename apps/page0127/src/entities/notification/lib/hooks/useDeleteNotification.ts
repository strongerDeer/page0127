/**
 * useDeleteNotification Hook
 * 알림 삭제 훅
 *
 * 학습 포인트:
 * - 읽음 처리와 같은 낙관적 업데이트 구조다. 클릭 즉시 목록에서 지우고,
 *   실패하면 스냅샷으로 되돌린다.
 * - 안 읽은 알림을 지우면 종 배지 숫자도 같이 줄어야 한다.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deleteNotification } from '../../api/notificationApi';
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

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNotification,
    onMutate: async (notificationId: string): Promise<Context> => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const snapshot = snapshotNotificationCache(queryClient);
      const shouldDecrement = wasUnread(queryClient, notificationId);

      // null을 반환하면 목록에서 제거된다
      patchNotificationLists(queryClient, (n) =>
        n.id === notificationId ? null : n
      );

      if (shouldDecrement) {
        patchUnreadCount(queryClient, (count) => count - 1);
      }

      return { snapshot };
    },
    onError: (_error, _notificationId, context) => {
      if (context) restoreNotificationCache(queryClient, context.snapshot);
      toast.error('알림 삭제에 실패했습니다.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
