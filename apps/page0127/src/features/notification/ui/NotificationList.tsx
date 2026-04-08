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

import { NotificationItem } from './NotificationItem';

type NotificationListProps = {
  userId: string;
  onClose?: () => void;
}

export const NotificationList = ({ userId, onClose }: NotificationListProps) => {
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
    // 읽지 않은 알림이면 읽음 처리
    if (!notification.is_read) {
      await markAsReadMutation.mutateAsync(notification.id);
    }

    // 알림 타입별 페이지 이동
    if (notification.type === 'follow') {
      router.push(`/${notification.actor.username || notification.actor_id}`);
    } else if (notification.target_id) {
      // 댓글, 좋아요 알림 → 활동 상세 페이지로 이동
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
        <p className='text-sm text-muted-foreground'>읽지 않은 알림이 없습니다</p>
      </div>
    );
  }

  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div className='flex flex-col'>
      {/* 헤더 */}
      <div className='flex items-center justify-between border-b p-4'>
        <h3 className='font-semibold'>알림</h3>
        {hasUnread && (
          <Button
            variant='ghost'
            size='sm'
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
          >
            모두 읽음
          </Button>
        )}
      </div>

      {/* 알림 목록 */}
      <ScrollArea className='h-96'>
        <div className='flex flex-col'>
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={() => handleNotificationClick(notification)}
              onDelete={handleDelete}
              onMarkAsRead={handleMarkAsReadSingle}
            />
          ))}
        </div>
      </ScrollArea>

      {/* 푸터 */}
      <div className='border-t p-2'>
        <Link href='/notifications' onClick={onClose}>
          <Button variant='ghost' className='w-full' size='sm'>
            모든 알림 보기
          </Button>
        </Link>
      </div>
    </div>
  );
}
