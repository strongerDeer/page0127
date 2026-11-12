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
    // - refetchInterval 5분: 탭을 보고 있는 동안만 돈다(백그라운드 탭은 react-query 가 멈춘다)
    // 처음엔 1분이었다. 요청 자체는 head count 하나지만 매번 서버 함수(proxy+인증)를 깨워서,
    // 탭을 하루 켜 두면 수백 번 호출이 쌓였다(2026-11-11 Vercel CPU 한도 초과 때 줄임).
    // Realtime 이 1순위이고 포커스 복귀 때도 다시 읽으니, 백업 폴링은 5분이면 충분하다.
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60 * 5,
  });
}
