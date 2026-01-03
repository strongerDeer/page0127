'use client';

/**
 * NotificationDropdown 컴포넌트
 * 헤더의 알림 아이콘 및 드롭다운
 *
 * 학습 포인트:
 * - Popover로 드롭다운 UI 구현
 * - 읽지 않은 알림 개수 뱃지 표시
 * - 실시간 알림 업데이트 (30초마다 refetch)
 */

import { useState } from 'react';

import { Bell } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover';

import { useUnreadCount } from '@/entities/notification';

import { NotificationList } from './NotificationList';

type NotificationDropdownProps = {
  userId: string;
}

export const NotificationDropdown = ({ userId }: NotificationDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: unreadCount } = useUnreadCount(userId);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant='ghost' size='icon' className='relative'>
          <Bell className='h-5 w-5' />
          {/* 읽지 않은 알림 뱃지 */}
          {unreadCount && unreadCount.count > 0 && (
            <span className='absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white'>
              {unreadCount.count > 99 ? '99+' : unreadCount.count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-96 p-0' align='end'>
        <NotificationList userId={userId} onClose={() => setIsOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
