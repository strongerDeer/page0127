import {
  type NameSource,
  toDisplayName,
} from '@/entities/profile/model/displayName';

import { SELF_NOTICE_TYPES } from '../model/types';
import { toActorSentence } from './actorSentence';
import { notificationHref } from './notificationHref';

import type { Notification, NotificationTarget } from '../model/types';

/** 서비스워커(public/sw.js)가 받는 모양. 두 쪽이 같은 이름을 써야 한다 */
export type PushPayload = {
  title: string;
  body: string;
  /** 알림을 누르면 열 경로. 없으면 알림 페이지로 */
  url: string;
  /** 받는 사람의 읽지 않은 알림 수 — 앱 아이콘 뱃지. 못 셌으면 없다 */
  badge?: number;
};

/** 푸시를 만드는 데 필요한 알림 칸 — 삽입하는 행 그대로 넘길 수 있다 */
export type PushableNotification = Pick<
  Notification,
  'user_id' | 'actor_id' | 'type'
> &
  Partial<Pick<Notification, 'target_id' | 'target_type' | 'message'>>;

const PUSH_TITLE = 'page0127.';

/**
 * 알림 한 건 → 잠금화면에 뜰 문장.
 *
 * actor 는 보낸 사람 프로필이다. 나에게 오는 알림(회상·읽는 중)은 쓰지 않는다.
 * target 은 가리키는 책의 제목·답글 여부 — 종 아이콘 목록(NotificationItem)과 같은 문장을 쓴다.
 * 문장을 못 만들면 null — 빈 푸시는 보내지 않는다.
 */
export const buildPushPayload = (
  notification: PushableNotification,
  actor: (NameSource & { username: string | null }) | null,
  target: NotificationTarget | null = null
): PushPayload | null => {
  // 콕 찌르기는 앱 안의 가벼운 초대다. 잠금화면 푸시로 확대하지 않는다.
  if (notification.type === 'reading_nudge') return null;
  const url =
    notificationHref(
      {
        type: notification.type,
        target_id: notification.target_id ?? null,
        target_type: notification.target_type ?? null,
      },
      actor?.username ?? null
    ) ?? '/notifications';

  if (SELF_NOTICE_TYPES.includes(notification.type)) {
    if (!notification.message) return null;
    return { title: PUSH_TITLE, body: notification.message, url };
  }

  const suffix = toActorSentence(notification.type, target);
  if (!suffix) return null;

  const name = actor ? toDisplayName(actor) : '누군가';
  return { title: PUSH_TITLE, body: `${name}${suffix}`, url };
};
