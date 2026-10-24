/**
 * 알림 시스템 타입 정의
 * 팔로우, 댓글, 좋아요 알림을 관리
 */

/**
 * 알림 타입
 * - follow: 팔로우 알림
 * - comment: 댓글 알림
 * - like: 좋아요 알림
 * - reading_reminder: 2주 넘게 읽는 중인 책 (나에게 오는 알림, actor = 본인)
 * - weekly_recap: 주간 회상 (나에게 오는 알림, actor = 본인, 대상 없음 → 홈)
 */
export type NotificationType =
  'follow' | 'comment' | 'like' | 'reading_reminder' | 'weekly_recap';

/** 다른 사람이 아니라 서비스가 '나'에게 보내는 알림 — 크론이 문장을 message 에 적어 둔다 */
export const SELF_NOTICE_TYPES: readonly NotificationType[] = [
  'reading_reminder',
  'weekly_recap',
];

/**
 * 알림 대상 타입
 * - book: 개인 서재 책 스레드 → /{username}/{bookId}
 * - global_book: 전역 책 스레드 → /books/info/{id}
 *
 * 옛 값 'activity'·'comment'는 지웠다. 댓글·좋아요 대상이 활동에서 책으로 옮겨졌고
 * (계획 1·2), 활동 상세 페이지도 사라졌다. 'comment'는 애초에 생성하는 코드가
 * 한 곳도 없는 죽은 값이었다. 남아 있던 행은 20260728000001에서 정리했다.
 */
export type NotificationTargetType = 'book' | 'global_book';

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
};

/**
 * 알림이 가리키는 책 — 문장에 제목을 넣고 답글인지 가르는 데 쓴다(서버가 붙인다).
 * - title: 받는 사람이 읽을 수 없는 책(비공개)이면 null
 * - isReply: 받는 사람이 책 주인이 아니면 답글 알림이다(전역 책 알림은 늘 답글)
 */
export type NotificationTarget = { title: string | null; isReply: boolean };

/**
 * 알림 조회 응답 (프로필 정보 포함)
 */
export type NotificationWithActor = {
  /** 좋아요·댓글 알림에만. 없으면 예전 문장을 쓴다 */
  target?: NotificationTarget | null;
  actor: {
    id: string;
    // 사용자가 프로필 설정에서 직접 넣기 전까지 null이다.
    // 화면에 쓸 때는 displayName 모듈로 username 대체를 거친다
    nickname: string | null;
    photo_url: string | null;
    username: string | null;
  };
} & Notification;

/**
 * 알림 목록 조회 옵션
 */
export type GetNotificationsOptions = {
  userId: string;
  limit?: number;
  offset?: number;
  is_read?: boolean; // 읽음/읽지 않음 필터
};

/**
 * 알림 읽음 처리 요청
 */
export type MarkAsReadDto = {
  notification_id: string;
  user_id: string;
};

/**
 * 전체 읽음 처리 요청
 */
export type MarkAllAsReadDto = {
  user_id: string;
};

/**
 * 읽지 않은 알림 개수 응답
 */
export type UnreadCountResponse = {
  count: number;
};
