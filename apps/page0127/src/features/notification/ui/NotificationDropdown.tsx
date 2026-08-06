'use client';

/**
 * NotificationDropdown 컴포넌트
 * 헤더의 알림 아이콘 및 드롭다운
 *
 * 학습 포인트:
 * - Popover로 드롭다운 UI 구현
 * - 읽지 않은 알림 개수 뱃지 표시
 * - Supabase Realtime WebSocket으로 즉시 업데이트 (폴링 제거)
 */

import { useState } from 'react';

import { Button } from '@repo/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui';
import { Bell } from 'lucide-react';

import {
  useNotificationRealtime,
  useUnreadCount,
} from '@/entities/notification';

import { NotificationList } from './NotificationList';

type NotificationDropdownProps = {
  userId: string;
};

export const NotificationDropdown = ({ userId }: NotificationDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: unreadCount } = useUnreadCount(userId);

  // Supabase Realtime 구독 — notifications 테이블 변경 시 자동으로 캐시 무효화
  useNotificationRealtime(userId);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {/*
          아이콘만 있는 버튼이라 이름을 직접 준다 — 스크린리더는 종 그림을 읽지 못한다.
          이 버튼은 GNB 에 있어 **로그인한 사람이 보는 모든 화면**에 나온다.

          읽지 않은 개수를 이름에 넣는다. 뱃지 숫자는 눈으로만 보이는 정보라,
          이름이 "알림" 뿐이면 새 알림이 있는지 소리로는 알 수 없다.
        */}
        <Button
          variant='ghost'
          size='icon-md'
          className='relative'
          aria-label={
            unreadCount && unreadCount.count > 0
              ? `알림, 읽지 않음 ${unreadCount.count}건`
              : '알림'
          }
        >
          <Bell className='h-5 w-5' />
          {/* 읽지 않은 알림 뱃지 — 이름에 이미 개수가 들어가므로 중복해 읽지 않게 숨긴다 */}
          {unreadCount && unreadCount.count > 0 && (
            <span
              aria-hidden='true'
              className='absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-white'
            >
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
};
