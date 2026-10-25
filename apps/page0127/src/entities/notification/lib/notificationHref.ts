import { profileHref } from '@/entities/profile/model/displayName';

import type { Notification } from '../model/types';

/**
 * 알림을 눌렀을 때 갈 곳. 갈 곳이 없으면 null(이동하지 않는다).
 *
 * 알림 드롭다운·알림 페이지·푸시(서비스워커 클릭) 세 곳이 같은 답을 내야 한다.
 * 각자 분기를 들고 있으면 새 알림 타입을 한쪽에만 더하는 일이 생긴다.
 */
export const notificationHref = (
  notification: Pick<Notification, 'type' | 'target_id' | 'target_type'>,
  actorUsername: string | null
): string | null => {
  // actor_id(uuid)로 보내면 /[username] 조회에 걸리지 않아 404가 된다 → username 이 없으면 이동하지 않는다
  if (notification.type === 'follow') return profileHref(actorUsername);

  // 주간 회상 카드는 내 서재에 있다. 회상의 actor 는 본인이라 actorUsername 이 곧 내 아이디다.
  // 아이디를 모르면 / 로 — 로그인 사용자를 서재(또는 온보딩)로 다시 보낸다
  if (notification.type === 'weekly_recap')
    return profileHref(actorUsername) ?? '/';

  if (!notification.target_id) return null;

  // 책 스레드 알림 — 소유자든 방문자든 내 서재 경로로 보내면
  // 소유자가 아닐 때 404가 나므로, 공개 상세 경로로 보낸다.
  if (notification.target_type === 'book') {
    return `/books/${notification.target_id}`;
  }
  // 전역 책 스레드 — 공개 책 소개 페이지로 보낸다
  if (notification.target_type === 'global_book') {
    return `/books/info/${notification.target_id}`;
  }
  return null;
};
