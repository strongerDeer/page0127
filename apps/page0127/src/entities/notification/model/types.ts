/**
 * 알림 시스템 타입 정의
 * 팔로우, 댓글, 좋아요 알림을 관리
 */

/**
 * 알림 타입
 * - follow: 팔로우 알림
 * - comment: 댓글 알림
 * - like: 좋아요 알림
 */
export type NotificationType = 'follow' | 'comment' | 'like';

/**
 * 알림 대상 타입
 * - activity: 활동 피드
 * - comment: 댓글
 */
export type NotificationTargetType = 'activity' | 'comment';

/**
 * 알림 엔티티 (DB 테이블 구조)
 */
export type Notification = {
  id: string;
  user_id: string; // 알림을 받는 사용자
  type: NotificationType;
  actor_id: string; // 알림을 발생시킨 사용자
  target_id: string | null; // 관련 리소스 ID (활동 ID, 댓글 ID 등)
  target_type: NotificationTargetType | null;
  is_read: boolean;
  message: string | null; // 선택적 메시지 (프론트에서 생성 가능)
  created_at: string;
  updated_at: string;
}

/**
 * 알림 생성 요청 DTO
 */
export type CreateNotificationDto = {
  user_id: string;
  type: NotificationType;
  actor_id: string;
  target_id?: string | null;
  target_type?: NotificationTargetType | null;
  message?: string | null;
}

/**
 * 알림 조회 응답 (프로필 정보 포함)
 */
export type NotificationWithActor = {
  actor: {
    id: string;
    nickname: string;
    photo_url: string | null;
    username: string | null;
  };
} & Notification

/**
 * 알림 목록 조회 옵션
 */
export type GetNotificationsOptions = {
  userId: string;
  limit?: number;
  offset?: number;
  is_read?: boolean; // 읽음/읽지 않음 필터
}

/**
 * 알림 읽음 처리 요청
 */
export type MarkAsReadDto = {
  notification_id: string;
  user_id: string;
}

/**
 * 전체 읽음 처리 요청
 */
export type MarkAllAsReadDto = {
  user_id: string;
}

/**
 * 읽지 않은 알림 개수 응답
 */
export type UnreadCountResponse = {
  count: number;
}
