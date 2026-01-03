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
    staleTime: 1000 * 30, // 30초 동안 fresh
    refetchInterval: 1000 * 30, // 30초마다 자동 refetch
  });
}
