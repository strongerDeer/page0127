'use client';

/**
 * NotificationItem 컴포넌트
 * 개별 알림 아이템
 *
 * 학습 포인트:
 * - 알림 타입별 메시지 및 아이콘 표시
 * - 읽지 않은 알림 시각적 강조 (배경색)
 * - 상대 시간 표시 (예: "3분 전")
 */

import { Heart, MessageCircle, UserPlus, X, Check } from 'lucide-react';
import Image from 'next/image';

import type { NotificationWithActor } from '@/entities/notification';

import { formatDistanceToNow } from '@/shared/lib/date';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';

interface NotificationItemProps {
  notification: NotificationWithActor;
  onClick: () => void;
  onDelete?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
}

export function NotificationItem({
  notification,
  onClick,
  onDelete,
  onMarkAsRead,
}: NotificationItemProps) {
  const { type, actor, is_read, created_at } = notification;

  // 알림 타입별 메시지 및 아이콘
  const getNotificationContent = () => {
    switch (type) {
      case 'follow':
        return {
          icon: <UserPlus className='h-4 w-4 text-blue-500' />,
          message: '님이 팔로우했습니다',
        };
      case 'comment':
        return {
          icon: <MessageCircle className='h-4 w-4 text-green-500' />,
          message: '님이 댓글을 남겼습니다',
        };
      case 'like':
        return {
          icon: <Heart className='h-4 w-4 text-red-500' />,
          message: '님이 좋아요를 눌렀습니다',
        };
      default:
        return {
          icon: null,
          message: '',
        };
    }
  };

  const { icon, message } = getNotificationContent();

  return (
    <div
      className={`flex w-full items-start gap-3 border-b p-4 transition-colors ${
        !is_read ? 'bg-blue-50' : ''
      }`}
    >
      {/* 프로필 이미지 */}
      <Avatar className='h-10 w-10'>
        <AvatarImage src={actor.photo_url || undefined} alt={actor.nickname} />
        <AvatarFallback>{actor.nickname?.[0] || '?'}</AvatarFallback>
      </Avatar>

      {/* 알림 내용 - 클릭 가능 영역 */}
      <button onClick={onClick} className='flex-1 space-y-1 text-left'>
        <div className='flex items-center gap-2'>
          {icon}
          <p className='text-sm'>
            <span className='font-semibold'>{actor.nickname}</span>
            {message}
          </p>
        </div>
        <p className='text-xs text-muted-foreground'>
          {formatDistanceToNow(created_at)}
        </p>
      </button>

      {/* 액션 버튼 영역 */}
      <div className='flex items-center gap-1'>
        {/* 읽지 않은 알림 표시 및 읽음 처리 버튼 */}
        {!is_read ? (
          <>
            <div className='h-2 w-2 rounded-full bg-blue-500'></div>
            {onMarkAsRead && (
              <Button
                variant='ghost'
                size='sm'
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
                className='h-8 w-8 p-0'
                title='읽음 처리'
              >
                <Check className='h-4 w-4' />
              </Button>
            )}
          </>
        ) : null}

        {/* 삭제 버튼 */}
        {onDelete && (
          <Button
            variant='ghost'
            size='sm'
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className='h-8 w-8 p-0 text-muted-foreground hover:text-destructive'
            title='삭제'
          >
            <X className='h-4 w-4' />
          </Button>
        )}
      </div>
    </div>
  );
}
