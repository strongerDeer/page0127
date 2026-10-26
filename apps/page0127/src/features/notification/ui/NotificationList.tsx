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

import { Button } from '@repo/ui';
import { ScrollArea } from '@repo/ui';

import {
  notificationHref,
  type NotificationWithActor,
  useDeleteNotification,
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
  useUnreadCount,
} from '@/entities/notification';

import { NotificationItem } from './NotificationItem';

type NotificationListProps = {
  userId: string;
  onClose?: () => void;
  onOpenEnvelope: (notification: NotificationWithActor) => void;
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
    <h3 className='font-medium'>알림</h3>
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
  // 높이를 고정하면 알림이 한두 개일 때 아래가 크게 빈다 — 최대 높이만 두고 넘치면 스크롤
  <ScrollArea className='[&_[data-slot=scroll-area-viewport]]:max-h-96'>
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
  onOpenEnvelope,
}: NotificationListProps) => {
  const router = useRouter();
  // 읽은 알림도 함께 보여 준다 — 읽지 않은 것만 두면 하나 읽는 순간 드롭다운이 비어 버린다.
  // 읽음 여부는 NotificationItem 이 배경색으로 구분한다
  const { data: notifications, isLoading } = useNotifications({
    userId,
    limit: 8,
  });
  // "모두 읽음"은 보이는 8개가 아니라 전체 기준 — 9번째 이후에 안 읽은 알림이 있어도 버튼이 떠야 한다
  const { data: unreadCount } = useUnreadCount(userId);
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  const handleNotificationClick = async (
    notification: NotificationWithActor
  ) => {
    if (notification.type === 'reading_nudge') {
      onOpenEnvelope(notification);
      onClose?.();
      return;
    }
    if (!notification.is_read) {
      await markAsReadMutation.mutateAsync(notification.id);
    }

    // 알림 타입별 페이지 이동 — 갈 곳은 notificationHref 한 곳에서 정한다(푸시 클릭과 공유)
    const href = notificationHref(notification, notification.actor.username);
    if (href) router.push(href);

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

  const hasUnread = (unreadCount?.count ?? 0) > 0;

  // 로딩·빈 상태에도 헤더와 "모든 알림 보기"는 남긴다.
  // 본문만 바꾸지 않으면 알림이 없을 때 데스크톱에서 알림 페이지로 갈 길이 사라진다
  const renderBody = () => {
    if (isLoading) {
      return (
        <div className='flex h-40 items-center justify-center'>
          <p className='text-sm text-muted-foreground'>로딩 중...</p>
        </div>
      );
    }
    if (!notifications || notifications.length === 0) {
      return (
        <div className='flex h-40 items-center justify-center'>
          <p className='text-sm text-muted-foreground'>
            아직 받은 알림이 없어요
          </p>
        </div>
      );
    }
    return (
      <NotificationList.Body
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onDelete={handleDelete}
        onMarkAsRead={handleMarkAsReadSingle}
      />
    );
  };

  return (
    <div className='flex flex-col'>
      <NotificationList.Header
        hasUnread={hasUnread}
        isPending={markAllAsReadMutation.isPending}
        onMarkAllAsRead={handleMarkAllAsRead}
      />

      {renderBody()}

      <NotificationList.Footer onClose={onClose} />
    </div>
  );
};

NotificationList.Header = NotificationListHeader;
NotificationList.Body = NotificationListBody;
NotificationList.Footer = NotificationListFooter;
