import { after } from 'next/server';

import webpush from 'web-push';

import { createAdminClient } from '@/shared/config/supabase/admin';

import {
  buildPushPayload,
  type PushableNotification,
} from '@/entities/notification';

import 'server-only';

/**
 * 웹푸시 발송 — 알림 행을 넣은 곳에서 그 행을 그대로 넘긴다.
 *
 * 왜 DB 트리거(웹훅)가 아니라 앱에서 보내는가:
 *   트리거로 붙이면 삽입하는 곳을 건드리지 않아도 되지만, 환경(로컬·dev·운영)마다
 *   웹훅 주소와 비밀값을 DB 에 따로 심어야 하고 실패가 앱 로그에 남지 않는다.
 *   알림을 넣는 곳이 다섯 군데뿐이라 한 줄씩 붙이는 쪽이 싸다.
 *
 * 실패해도 알림 자체(종 아이콘)는 이미 들어갔다 — 푸시는 곁들이는 경로라
 * 여기서 나는 오류는 로그만 남기고 삼킨다.
 */

type VapidKeys = { publicKey: string; privateKey: string; subject: string };

const readVapidKeys = (): VapidKeys | null => {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;

  // 푸시 서비스(FCM·Apple)가 문제가 생겼을 때 연락할 곳. mailto: 나 https 주소여야 한다
  const subject =
    process.env.VAPID_SUBJECT ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://page0127.com';

  return { publicKey, privateKey, subject };
};

/** 푸시를 보내도 되는 환경인가. 키가 없으면 구독 API 도 닫는다 */
export const isPushConfigured = (): boolean => readVapidKeys() !== null;

type SubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type ActorRow = {
  id: string;
  nickname: string | null;
  username: string | null;
};

/** 푸시가 잠금화면에 남아 있을 최대 시간. 기기가 꺼져 있으면 이만큼 기다렸다 버린다 */
const PUSH_TTL_SECONDS = 60 * 60 * 24;

/**
 * 알림 행들을 각 받는 사람의 모든 기기로 보낸다.
 *
 * 크론처럼 응답을 기다려도 되는 곳은 await 하고, 사용자 요청 안에서는
 * schedulePush 로 응답을 보낸 뒤에 돌린다.
 */
export const sendPushForNotifications = async (
  notifications: PushableNotification[]
): Promise<{ sent: number; removed: number }> => {
  const vapid = readVapidKeys();
  if (!vapid || notifications.length === 0) return { sent: 0, removed: 0 };

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const admin = createAdminClient();
  const userIds = [...new Set(notifications.map((n) => n.user_id))];

  const { data: subscriptions, error: subError } = await admin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', userIds)
    .returns<SubscriptionRow[]>();

  if (subError) {
    console.error('푸시 구독 조회 실패:', subError);
    return { sent: 0, removed: 0 };
  }
  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, removed: 0 };
  }

  // 보낸 사람 이름 — 나에게 오는 알림(actor = 본인)은 필요 없다
  const actorIds = [
    ...new Set(
      notifications
        .filter((n) => n.actor_id !== n.user_id)
        .map((n) => n.actor_id)
    ),
  ];
  const actors = new Map<string, ActorRow>();
  if (actorIds.length > 0) {
    const { data } = await admin
      .from('profiles')
      .select('id, nickname, username')
      .in('id', actorIds)
      .returns<ActorRow[]>();
    data?.forEach((actor) => actors.set(actor.id, actor));
  }

  // 받는 사람별 읽지 않은 알림 수 — 서비스워커가 앱 아이콘 뱃지 숫자로 쓴다.
  // 사람 수만큼 count 쿼리가 나가지만, 한 번에 받는 사람이 많은 건 크론뿐이고
  // 그것도 구독한 사람(위 subscriptions)으로 좁힌 뒤다.
  const subscribedUserIds = [...new Set(subscriptions.map((s) => s.user_id))];
  const unreadCounts = new Map<string, number>();
  await Promise.all(
    subscribedUserIds.map(async (userId) => {
      const { count } = await admin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      if (typeof count === 'number') unreadCounts.set(userId, count);
    })
  );

  const expired: string[] = [];
  let sent = 0;

  const jobs = notifications.flatMap((notification) => {
    const built = buildPushPayload(
      notification,
      actors.get(notification.actor_id) ?? null
    );
    if (!built) return [];
    const payload = {
      ...built,
      badge: unreadCounts.get(notification.user_id),
    };

    return subscriptions
      .filter((sub) => sub.user_id === notification.user_id)
      .map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify(payload),
            { TTL: PUSH_TTL_SECONDS }
          );
          sent += 1;
        } catch (error) {
          // 404·410 = 사용자가 브라우저에서 권한을 끄거나 앱을 지워 구독이 사라졌다.
          // 다시 살아나지 않으므로 지운다. 그 밖의 오류(5xx·네트워크)는 다음에 다시 시도된다.
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            expired.push(sub.id);
          } else {
            console.error('푸시 발송 실패:', statusCode, error);
          }
        }
      });
  });

  await Promise.allSettled(jobs);

  if (expired.length > 0) {
    const { error } = await admin
      .from('push_subscriptions')
      .delete()
      .in('id', expired);
    if (error) console.error('만료된 푸시 구독 삭제 실패:', error);
  }

  return { sent, removed: expired.length };
};

/**
 * 응답을 먼저 보내고 그 뒤에 푸시를 보낸다 (next/server 의 after).
 *
 * 좋아요·댓글을 누른 사람이 푸시 서비스 왕복(수백 ms)을 기다릴 이유가 없다.
 */
export const schedulePush = (notifications: PushableNotification[]): void => {
  if (notifications.length === 0 || !isPushConfigured()) return;

  after(async () => {
    try {
      await sendPushForNotifications(notifications);
    } catch (error) {
      console.error('푸시 발송 예외:', error);
    }
  });
};
