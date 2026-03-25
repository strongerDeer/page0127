/**
 * useUnreadCount Hook
 * 읽지 않은 알림 개수 조회 React Query 훅
 */

import { useQuery } from '@tanstack/react-query';

import { getUnreadCount } from '../../api/notificationApi';
import { notificationKeys } from '../../model/queryKeys';

/**
 * 읽지 않은 알림 개수 조회 훅
 * @param userId - 사용자 ID
 */
export function useUnreadCount(userId: string | undefined) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => getUnreadCount(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5분 (Realtime으로 받으니 폴링 불필요)
    // refetchInterval 제거 — useNotificationRealtime이 WebSocket으로 대체
  });
}
