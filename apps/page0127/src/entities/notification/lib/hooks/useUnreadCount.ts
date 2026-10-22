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
    // Realtime 이 1순위지만 그것만 믿지 않는다 (2026-10-22 운영에서 새로고침해야 숫자가
    // 바뀌는 일이 있었다). 연결이 조용히 끊겨도 아래 두 가지로 1분 안에 따라잡는다.
    // - staleTime 30초: 탭으로 돌아오면(refetchOnWindowFocus) 다시 읽는다. 5분이면 포커스해도 안 읽었다
    // - refetchInterval 1분: 탭을 보고 있는 동안만 돈다(백그라운드 탭은 react-query 가 멈춘다)
    // 요청은 head count 하나라 1분 폴링 비용은 무시할 만하다.
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}
