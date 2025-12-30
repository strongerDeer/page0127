/**
 * Notification 엔티티 Query Keys
 * 알림 관련 React Query 쿼리 키 관리
 */

import type { GetNotificationsOptions } from './types';

export const notificationKeys = {
  // 모든 알림 관련 쿼리의 기본 키
  all: ['notifications'] as const,

  // 목록 조회 관련
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (options: GetNotificationsOptions) =>
    [...notificationKeys.lists(), options] as const,

  // 읽지 않은 알림 개수
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
} as const;
