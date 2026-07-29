import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'vitest';

import { notificationKeys } from '../model/queryKeys';
import {
  patchNotificationLists,
  patchUnreadCount,
  restoreNotificationCache,
  snapshotNotificationCache,
  transformList,
  wasUnread,
} from './optimisticCache';

import type { NotificationWithActor } from '../model/types';
import type { InfiniteData } from '@tanstack/react-query';

const noti = (
  id: string,
  is_read = false
): NotificationWithActor =>
  ({
    id,
    user_id: 'me',
    type: 'like',
    actor_id: 'other',
    target_id: 'book-1',
    target_type: 'book',
    is_read,
    message: null,
    created_at: '2026-07-29T00:00:00Z',
    updated_at: '2026-07-29T00:00:00Z',
    actor: {
      id: 'other',
      nickname: '상대',
      photo_url: null,
      username: 'other',
    },
  }) as NotificationWithActor;

const listKey = notificationKeys.list({ userId: 'me' });
const infiniteKey = notificationKeys.infinite('all');

describe('transformList', () => {
  it('null을 반환한 알림은 목록에서 빠진다', () => {
    const result = transformList([noti('a'), noti('b')], (n) =>
      n.id === 'a' ? null : n
    );

    expect(result.map((n) => n.id)).toEqual(['b']);
  });

  it('변환된 값으로 교체된다', () => {
    const result = transformList([noti('a')], (n) => ({ ...n, is_read: true }));

    expect(result[0].is_read).toBe(true);
  });
});

describe('알림 캐시 낙관적 조작', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    queryClient.setQueryData(listKey, [noti('a'), noti('b', true)]);
    queryClient.setQueryData<InfiniteData<NotificationWithActor[]>>(
      infiniteKey,
      { pages: [[noti('a')], [noti('b', true)]], pageParams: [0, 1] }
    );
    queryClient.setQueryData(notificationKeys.unreadCount(), { count: 1 });
  });

  it('드롭다운 목록과 무한스크롤 목록에 동시에 적용된다', () => {
    patchNotificationLists(queryClient, (n) =>
      n.id === 'a' ? { ...n, is_read: true } : n
    );

    const list = queryClient.getQueryData<NotificationWithActor[]>(listKey);
    const infinite =
      queryClient.getQueryData<InfiniteData<NotificationWithActor[]>>(
        infiniteKey
      );

    expect(list?.find((n) => n.id === 'a')?.is_read).toBe(true);
    expect(infinite?.pages[0][0].is_read).toBe(true);
  });

  it('삭제는 양쪽 목록에서 모두 빠진다', () => {
    patchNotificationLists(queryClient, (n) => (n.id === 'a' ? null : n));

    const list = queryClient.getQueryData<NotificationWithActor[]>(listKey);
    const infinite =
      queryClient.getQueryData<InfiniteData<NotificationWithActor[]>>(
        infiniteKey
      );

    expect(list?.map((n) => n.id)).toEqual(['b']);
    expect(infinite?.pages[0]).toEqual([]);
  });

  it('배지 숫자는 0 아래로 내려가지 않는다', () => {
    patchUnreadCount(queryClient, (c) => c - 5);

    expect(
      queryClient.getQueryData<{ count: number }>(
        notificationKeys.unreadCount()
      )?.count
    ).toBe(0);
  });

  it('wasUnread — 안 읽은 알림만 true', () => {
    expect(wasUnread(queryClient, 'a')).toBe(true);
    expect(wasUnread(queryClient, 'b')).toBe(false);
  });

  it('wasUnread — 캐시에 없는 알림은 배지를 건드리지 않도록 false', () => {
    expect(wasUnread(queryClient, 'unknown')).toBe(false);
  });

  it('스냅샷으로 되돌리면 목록과 배지가 모두 복원된다', () => {
    const snapshot = snapshotNotificationCache(queryClient);

    patchNotificationLists(queryClient, (n) => (n.id === 'a' ? null : n));
    patchUnreadCount(queryClient, () => 0);

    restoreNotificationCache(queryClient, snapshot);

    expect(
      queryClient.getQueryData<NotificationWithActor[]>(listKey)?.map((n) => n.id)
    ).toEqual(['a', 'b']);
    expect(
      queryClient.getQueryData<{ count: number }>(
        notificationKeys.unreadCount()
      )?.count
    ).toBe(1);
  });
});
