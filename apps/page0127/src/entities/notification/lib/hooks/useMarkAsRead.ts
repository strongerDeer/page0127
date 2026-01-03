/**
 * useMarkAsRead Hook
 * 알림 읽음 처리 Mutation 훅
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { markAllAsRead,markAsRead } from '../../api/notificationApi';
import { notificationKeys } from '../../model/queryKeys';

/**
 * 개별 알림 읽음 처리 훅
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      // 알림 목록 및 읽지 않은 개수 캐시 무효화
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
    onSuccess: () => {
      // 알림 목록 및 읽지 않은 개수 캐시 무효화
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
