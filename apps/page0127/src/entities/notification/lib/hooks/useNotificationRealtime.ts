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

    // Supabase SDK(약 270KB, gzip 약 85KB)는 여기서 처음 필요해질 때 받는다.
    // 이 훅은 모든 페이지의 GNB(알림 배지)에 붙어 있어, 파일 상단에서 import 하면
    // 비로그인 방문자까지 첫 로드에 SDK 를 통째로 내려받는다. 구독은 hydration
    // 뒤에 열려도 되는 일이라 지연 로드해도 체감 차이가 없다.
    let cleanup: (() => void) | undefined;
    // import 가 끝나기 전에 언마운트·userId 변경이 오면 구독을 열지 않는다.
    // (이 플래그 없이 then 안에서 바로 subscribe 하면 정리되지 않는 채널이 남는다)
    let cancelled = false;

    void import('@/shared/config/supabase/client').then(({ createClient }) => {
      if (cancelled) return;

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
        .subscribe((status, err) => {
          // 연결이 실패하면 새로고침 전까지 종 숫자가 멈춘다 — 조용히 넘기지 않고
          // console.error 로 남겨 Sentry 이슈가 되게 한다(captureConsoleIntegration).
          // 숫자는 useUnreadCount 의 폴링·포커스 재조회가 대신 따라잡는다.
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('[notifications] Realtime 구독 실패:', status, err);
          }
        });

      cleanup = () => {
        supabase.removeChannel(channel);
      };
    });

    // 서비스워커가 푸시를 받으면 열린 탭에 알려 준다(public/sw.js notifyOpenTabs).
    // Realtime 이 끊긴 탭도 이 경로로는 바로 갱신된다.
    const handleWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'page0127:notification') return;
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(),
      });
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
    };
    navigator.serviceWorker?.addEventListener('message', handleWorkerMessage);

    // 클린업: 컴포넌트 언마운트 시 WebSocket 구독 해제
    // 이게 없으면 페이지를 벗어나도 연결이 계속 살아있다
    return () => {
      cancelled = true;
      cleanup?.();
      navigator.serviceWorker?.removeEventListener(
        'message',
        handleWorkerMessage
      );
    };
  }, [userId, queryClient]);
}
