/**
 * useDeleteNotification Hook
 * 알림 삭제 훅
 *
 * 학습 포인트:
 * - useMutation으로 알림 삭제 처리
 * - 삭제 후 캐시 무효화로 목록 자동 업데이트
 * - 읽지 않은 알림 개수도 업데이트
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteNotification } from '../../api/notificationApi';
import { notificationKeys } from '../../model/queryKeys';

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      // 알림 목록 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: notificationKeys.lists(),
      });

      // 읽지 않은 알림 개수 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      });
    },
  });
}
