/**
 * useNotificationRealtime Hook
 * Supabase Realtime으로 알림 변경을 구독 (WebSocket)
 *
 * 학습 포인트 (Day 16~17):
 * - useEffect로 WebSocket 연결을 열고
 * - 클린업 함수에서 구독을 해제한다
 * - 클린업 없이 두면 컴포넌트가 사라져도 연결이 남는 메모리 누수 발생
 */

'use client';

import { useEffect } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/shared/config/supabase/client';

import { notificationKeys } from '../../model/queryKeys';

/**
 * notifications 테이블 변경을 실시간으로 구독
 * INSERT / UPDATE / DELETE 발생 시 TanStack Query 캐시를 무효화해
 * 자동으로 최신 데이터를 가져온다
 */
export function useNotificationRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // userId 없으면 구독 안 함 (비로그인 상태)
    if (!userId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT | UPDATE | DELETE 전부 감지
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`, // 내 알림만
        },
        () => {
          // DB 변경 감지 → 캐시 무효화 → TanStack Query가 자동으로 재요청
          queryClient.invalidateQueries({
            queryKey: notificationKeys.unreadCount(),
          });
          queryClient.invalidateQueries({
            queryKey: notificationKeys.lists(),
          });
        }
      )
      .subscribe();
    // 구독 상태(SUBSCRIBED / TIMED_OUT / CHANNEL_ERROR)는 필요 시 콜백에서
    // console.warn 으로 출력해 디버깅한다. (no-console: log 금지)

    // 클린업: 컴포넌트 언마운트 시 WebSocket 구독 해제
    // 이게 없으면 페이지를 벗어나도 연결이 계속 살아있다
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
