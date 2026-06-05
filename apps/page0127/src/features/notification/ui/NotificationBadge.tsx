'use client';

/**
 * NotificationBadge 컴포넌트
 * 사이드바 '알림' 메뉴에 읽지 않은 알림 개수를 표시
 *
 * 학습 포인트:
 * - 안 읽은 개수만 담당하는 작은 컴포넌트로 분리
 *   (Sidebar가 알림 도메인 훅에 직접 의존하지 않도록)
 * - Supabase Realtime 구독으로 새 알림이 오면 즉시 반영
 */

import { useNotificationRealtime, useUnreadCount } from '@/entities/notification';

type NotificationBadgeProps = {
  userId: string;
};

export const NotificationBadge = ({ userId }: NotificationBadgeProps) => {
  const { data: unreadCount } = useUnreadCount(userId);

  // Realtime 구독 — notifications 테이블 변경 시 캐시 무효화 후 자동 갱신
  useNotificationRealtime(userId);

  // 읽지 않은 알림이 없으면 뱃지를 렌더하지 않는다
  if (!unreadCount || unreadCount.count <= 0) {
    return null;
  }

  return (
    <span className='ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white'>
      {unreadCount.count > 99 ? '99+' : unreadCount.count}
    </span>
  );
};
