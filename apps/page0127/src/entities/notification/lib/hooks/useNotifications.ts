/**
 * useNotifications Hook
 * 알림 목록 조회 React Query 훅
 */

import { useQuery } from '@tanstack/react-query';

import { getNotifications } from '../../api/notificationApi';
import { notificationKeys } from '../../model/queryKeys';

import type { GetNotificationsOptions } from '../../model/types';

/**
 * 알림 목록 조회 훅
 * @param options - 조회 옵션
 */
export function useNotifications(options: GetNotificationsOptions) {
  return useQuery({
    queryKey: notificationKeys.list(options),
    queryFn: () => getNotifications(options),
    enabled: !!options.userId,
    staleTime: 1000 * 60, // 1분 동안 fresh
    refetchInterval: 1000 * 60, // 1분마다 자동 refetch
  });
}
