/**
 * Notification API
 * 알림 관련 API 요청 함수들
 */

import { apiClient } from '@/shared/api/client';
import type {
  Notification,
  NotificationWithActor,
  GetNotificationsOptions,
  UnreadCountResponse,
  CreateNotificationDto,
} from '../model/types';

/**
 * 알림 목록 조회
 * @param options - 조회 옵션 (userId, limit, offset, is_read)
 * @returns 알림 목록 (프로필 정보 포함)
 */
export async function getNotifications(
  options: GetNotificationsOptions
): Promise<NotificationWithActor[]> {
  const { userId, limit = 20, offset = 0, is_read } = options;

  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  if (is_read !== undefined) {
    params.append('is_read', String(is_read));
  }

  const { data } = await apiClient.get<NotificationWithActor[]>(
    `/notifications?${params.toString()}`
  );

  return data;
}

/**
 * 읽지 않은 알림 개수 조회
 * @param userId - 사용자 ID
 * @returns 읽지 않은 알림 개수
 */
export async function getUnreadCount(
  userId: string
): Promise<UnreadCountResponse> {
  const { data } = await apiClient.get<UnreadCountResponse>(
    '/notifications/unread-count'
  );

  return data;
}

/**
 * 알림 읽음 처리
 * @param notificationId - 알림 ID
 * @returns 업데이트된 알림
 */
export async function markAsRead(
  notificationId: string
): Promise<Notification> {
  const { data } = await apiClient.patch<Notification>(
    `/notifications/${notificationId}/read`
  );

  return data;
}

/**
 * 전체 알림 읽음 처리
 * @returns 성공 여부
 */
export async function markAllAsRead(): Promise<{ success: boolean }> {
  const { data } = await apiClient.patch<{ success: boolean }>(
    '/notifications/read-all'
  );

  return data;
}

/**
 * 알림 삭제
 * @param notificationId - 알림 ID
 * @returns 성공 여부
 */
export async function deleteNotification(
  notificationId: string
): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete<{ success: boolean }>(
    `/notifications/${notificationId}`
  );

  return data;
}

/**
 * 알림 생성 (내부 API - 서버에서만 사용)
 * @param dto - 알림 생성 데이터
 * @returns 생성된 알림
 */
export async function createNotification(
  dto: CreateNotificationDto
): Promise<Notification> {
  const { data } = await apiClient.post<Notification>('/notifications', dto);

  return data;
}
