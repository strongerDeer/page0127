'use client';

/**
 * NotificationList 컴포넌트
 * 알림 목록 표시
 *
 * 학습 포인트:
 * - 알림 타입별 메시지 생성
 * - 전체 읽음 처리 기능
 * - 개별 알림 클릭 시 읽음 처리 및 해당 페이지로 이동
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';

import {
  type NotificationWithActor,
  useDeleteNotification,
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
} from '@/entities/notification';
import { profileHref } from '@/entities/profile/model/displayName';

import { NotificationItem } from './NotificationItem';

type NotificationListProps = {
  userId: string;
  onClose?: () => void;
};

type NotificationListHeaderProps = {
  hasUnread: boolean;
  isPending: boolean;
  onMarkAllAsRead: () => void;
};

type NotificationListBodyProps = {
  notifications: NotificationWithActor[];
  onNotificationClick: (notification: NotificationWithActor) => void;
  onDelete: (id: string) => void;
  onMarkAsRead: (id: string) => void;
};

type NotificationListFooterProps = {
  onClose?: () => void;
};

const NotificationListHeader = ({
  hasUnread,
  isPending,
  onMarkAllAsRead,
}: NotificationListHeaderProps) => (
  <div className='flex items-center justify-between border-b p-4'>
    <h3 className='font-semibold'>알림</h3>
    {hasUnread && (
      <Button
        variant='ghost'
        size='sm'
        onClick={onMarkAllAsRead}
        disabled={isPending}
      >
        모두 읽음
      </Button>
    )}
  </div>
);

const NotificationListBody = ({
  notifications,
  onNotificationClick,
  onDelete,
  onMarkAsRead,
}: NotificationListBodyProps) => (
  <ScrollArea className='h-96'>
    <div className='flex flex-col'>
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClick={() => onNotificationClick(notification)}
          onDelete={onDelete}
          onMarkAsRead={onMarkAsRead}
        />
      ))}
    </div>
  </ScrollArea>
);

const NotificationListFooter = ({ onClose }: NotificationListFooterProps) => (
  <div className='border-t p-2'>
    <Link href='/notifications' onClick={onClose}>
      <Button variant='ghost' className='w-full' size='sm'>
        모든 알림 보기
      </Button>
    </Link>
  </div>
);

export const NotificationList = ({
  userId,
  onClose,
}: NotificationListProps) => {
  const router = useRouter();
  const { data: notifications, isLoading } = useNotifications({
    userId,
    limit: 5,
    is_read: false, // 드롭다운에서는 읽지 않은 알림만 표시
  });
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  const handleNotificationClick = async (
    notification: NotificationWithActor
  ) => {
    if (!notification.is_read) {
      await markAsReadMutation.mutateAsync(notification.id);
    }

    if (notification.type === 'follow') {
      // actor_id(uuid)로 보내면 /[username] 조회에 걸리지 않아 404가 된다 → 이동하지 않는다
      const href = profileHref(notification.actor);
      if (href) router.push(href);
      // 책 스레드 알림 — 소유자든 방문자든 내 서재 경로로 보내면
      // 소유자가 아닐 때 404가 나므로, 공개 상세 경로로 보낸다.
    } else if (notification.target_type === 'book' && notification.target_id) {
      router.push(`/books/${notification.target_id}`);
      // 기존 활동 알림은 그대로 둔다 — 과거 알림이 깨지면 안 된다
    } else if (notification.target_id) {
      router.push(`/feed/${notification.target_id}`);
    }

    onClose?.();
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsReadMutation.mutateAsync();
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotificationMutation.mutateAsync(notificationId);
  };

  const handleMarkAsReadSingle = async (notificationId: string) => {
    await markAsReadMutation.mutateAsync(notificationId);
  };

  if (isLoading) {
    return (
      <div className='flex h-64 items-center justify-center'>
        <p className='text-sm text-muted-foreground'>로딩 중...</p>
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className='flex h-64 flex-col items-center justify-center gap-2'>
        <p className='text-sm text-muted-foreground'>
          읽지 않은 알림이 없습니다
        </p>
      </div>
    );
  }

  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div className='flex flex-col'>
      <NotificationList.Header
        hasUnread={hasUnread}
        isPending={markAllAsReadMutation.isPending}
        onMarkAllAsRead={handleMarkAllAsRead}
      />

      <NotificationList.Body
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onDelete={handleDelete}
        onMarkAsRead={handleMarkAsReadSingle}
      />

      <NotificationList.Footer onClose={onClose} />
    </div>
  );
};

NotificationList.Header = NotificationListHeader;
NotificationList.Body = NotificationListBody;
NotificationList.Footer = NotificationListFooter;
