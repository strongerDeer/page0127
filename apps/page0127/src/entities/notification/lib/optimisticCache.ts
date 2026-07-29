/**
 * 알림 낙관적 업데이트용 캐시 조작 헬퍼
 *
 * 알림 캐시는 세 갈래로 나뉘어 있다.
 * - 드롭다운: notificationKeys.list(options) → 배열
 * - 알림 페이지: notificationKeys.infinite(filter) → 페이지 배열(InfiniteData)
 * - 종 배지: notificationKeys.unreadCount() → { count }
 *
 * 낙관적 업데이트가 한 갈래만 고치면 화면마다 값이 어긋나므로,
 * 세 갈래를 항상 같이 다루도록 이 모듈에 모아둔다.
 */

import { notificationKeys } from '../model/queryKeys';

import type { NotificationWithActor, UnreadCountResponse } from '../model/types';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';

/** 알림 하나를 어떻게 바꿀지. null을 반환하면 목록에서 제거한다. */
export type NotificationTransform = (
  notification: NotificationWithActor
) => NotificationWithActor | null;

/** 순수 함수 — 목록 하나에 변환을 적용한다 (테스트 대상) */
export const transformList = (
  list: NotificationWithActor[],
  transform: NotificationTransform
): NotificationWithActor[] =>
  list
    .map(transform)
    .filter((item): item is NotificationWithActor => item !== null);

/**
 * 두 갈래 목록 캐시(드롭다운·무한스크롤)에 같은 변환을 적용한다.
 * 진행 중이던 refetch가 낙관적 값을 덮어쓰지 않도록 호출 전에 cancelQueries를 해야 한다.
 */
export function patchNotificationLists(
  queryClient: QueryClient,
  transform: NotificationTransform
): void {
  queryClient.setQueriesData<NotificationWithActor[]>(
    { queryKey: notificationKeys.lists() },
    (old) => (old ? transformList(old, transform) : old)
  );

  queryClient.setQueriesData<InfiniteData<NotificationWithActor[]>>(
    { queryKey: [...notificationKeys.all, 'infinite'] },
    (old) =>
      old && {
        ...old,
        pages: old.pages.map((page) => transformList(page, transform)),
      }
  );
}

/** 종 배지 숫자를 갱신한다. 음수로 내려가지 않게 막는다. */
export function patchUnreadCount(
  queryClient: QueryClient,
  next: (current: number) => number
): void {
  queryClient.setQueryData<UnreadCountResponse>(
    notificationKeys.unreadCount(),
    (old) => (old ? { count: Math.max(0, next(old.count)) } : old)
  );
}

/**
 * 되돌리기용 스냅샷.
 * 알림 관련 캐시 전체를 통째로 떠 두었다가 실패 시 그대로 복원한다.
 * (갈래별로 따로 관리하면 복원 누락이 생기기 쉽다)
 */
export type NotificationCacheSnapshot = ReturnType<
  QueryClient['getQueriesData']
>;

export function snapshotNotificationCache(
  queryClient: QueryClient
): NotificationCacheSnapshot {
  return queryClient.getQueriesData({ queryKey: notificationKeys.all });
}

export function restoreNotificationCache(
  queryClient: QueryClient,
  snapshot: NotificationCacheSnapshot
): void {
  snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
}

/** 캐시에 있는 알림이 "안 읽음"이었는지 — 배지 숫자를 줄일지 판단할 때 쓴다 */
export function wasUnread(
  queryClient: QueryClient,
  notificationId: string
): boolean {
  const lists = queryClient.getQueriesData<NotificationWithActor[]>({
    queryKey: notificationKeys.lists(),
  });

  for (const [, list] of lists) {
    const found = list?.find((n) => n.id === notificationId);
    if (found) return !found.is_read;
  }

  const infinites = queryClient.getQueriesData<
    InfiniteData<NotificationWithActor[]>
  >({ queryKey: [...notificationKeys.all, 'infinite'] });

  for (const [, data] of infinites) {
    for (const page of data?.pages ?? []) {
      const found = page.find((n) => n.id === notificationId);
      if (found) return !found.is_read;
    }
  }

  // 캐시에 없으면 배지를 건드리지 않는다 (서버 응답 후 invalidate가 바로잡는다)
  return false;
}
