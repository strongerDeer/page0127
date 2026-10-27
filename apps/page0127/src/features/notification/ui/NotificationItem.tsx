'use client';

import { Avatar, AvatarFallback, AvatarImage, Button } from '@repo/ui';
import {
  BookOpen,
  Check,
  Heart,
  type LucideIcon,
  Mail,
  MessageCircle,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react';

import { RelativeTime } from '@/shared/ui/RelativeTime';

import { toActorSentence } from '@/entities/notification/lib/actorSentence';
import {
  type NotificationType,
  type NotificationWithActor,
  SELF_NOTICE_TYPES,
} from '@/entities/notification/model/types';
import { toDisplayName, toInitial } from '@/entities/profile/model/displayName';

// 유형이 추가되면 아이콘과 이름도 함께 정의해야 한다. 차트 색은 알림에 사용하지 않는다.
const notificationPresentation = {
  follow: { Icon: UserPlus, label: '팔로우' },
  comment: { Icon: MessageCircle, label: '댓글·답글' },
  like: { Icon: Heart, label: '좋아요' },
  reading_nudge: { Icon: Mail, label: '책 봉투' },
  reading_reminder: { Icon: BookOpen, label: '독서 리마인더' },
  weekly_recap: { Icon: Sparkles, label: '주간 회상' },
} satisfies Record<NotificationType, { Icon: LucideIcon; label: string }>;

type NotificationItemProps = {
  notification: NotificationWithActor;
  onClick: () => void;
  onDelete?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
  selection?: { checked: boolean; disabled?: boolean; onChange: () => void };
};

export const NotificationItem = ({
  notification,
  onClick,
  onDelete,
  onMarkAsRead,
  selection,
}: NotificationItemProps) => {
  const { type, actor, is_read, created_at } = notification;
  const isSelfNotice = SELF_NOTICE_TYPES.includes(type);
  const { Icon, label: defaultLabel } = notificationPresentation[type];
  const label =
    type === 'reading_nudge' && notification.envelope
      ? notification.envelope.kind === 'invitation'
        ? '같이 읽기 초대'
        : notification.envelope.kind === 'note'
          ? '한마디'
          : '책 추천'
      : defaultLabel;
  const actorName = toDisplayName(actor);
  const message =
    type === 'reading_reminder'
      ? (notification.message ?? '오래 읽고 있는 책이 있어요')
      : type === 'weekly_recap'
        ? (notification.message ?? '이번 주 회상이 도착했어요')
        : (toActorSentence(type, notification.target) ?? '');

  return (
    <div
      className={`flex w-full items-start gap-2 border-b border-line-soft p-4 last:border-b-0 sm:gap-3 ${is_read ? 'bg-card' : 'bg-accent'}`}
    >
      {selection && (
        <input
          type='checkbox'
          className='mt-1 size-4 shrink-0 accent-primary'
          aria-label={`${label} 알림 선택: ${isSelfNotice ? message : actorName}`}
          checked={selection.checked}
          disabled={selection.disabled}
          onChange={selection.onChange}
        />
      )}
      <button
        type='button'
        onClick={onClick}
        className='flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
      >
        {isSelfNotice ? (
          <span
            className='flex size-10 shrink-0 items-center justify-center rounded-full bg-sunken text-primary'
            aria-hidden='true'
          >
            <Icon className='size-5' />
          </span>
        ) : (
          <Avatar className='size-10 shrink-0'>
            <AvatarImage src={actor.photo_url || undefined} alt='' />
            <AvatarFallback>{toInitial(actor)}</AvatarFallback>
          </Avatar>
        )}
        <span className='min-w-0 space-y-1'>
          <span className='flex items-center gap-1.5 text-xs font-medium text-primary'>
            <Icon className='size-3.5 shrink-0' aria-hidden='true' />
            {label}
            {!is_read && (
              <span
                className='size-1.5 shrink-0 rounded-full bg-primary'
                aria-label='읽지 않음'
              />
            )}
          </span>
          <span className='block break-words text-sm text-text-strong [overflow-wrap:anywhere]'>
            {type === 'reading_nudge' ? (
              <>
                <span className='font-medium'>{actorName}</span>님이 책 봉투를
                보냈어요.
              </>
            ) : (
              <>
                {!isSelfNotice && (
                  <span className='font-medium'>{actorName}</span>
                )}
                {message}
              </>
            )}
          </span>
          {type === 'reading_nudge' && (
            <span className='block text-xs text-text-body'>
              {notification.message || '메시지 열어보기 ↗'}
            </span>
          )}
          <RelativeTime
            date={created_at}
            className={`block text-xs ${is_read ? 'text-text-subtle' : 'text-text-body'}`}
          />
        </span>
      </button>
      <div className='flex shrink-0 flex-col items-center gap-1 sm:flex-row'>
        {!is_read && onMarkAsRead && (
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label='읽음 처리'
            onClick={() => onMarkAsRead(notification.id)}
          >
            <Check className='size-4' aria-hidden='true' />
          </Button>
        )}
        {onDelete && (
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label='알림 삭제'
            className='text-text-body hover:text-destructive'
            onClick={() => onDelete(notification.id)}
          >
            <X className='size-4' aria-hidden='true' />
          </Button>
        )}
      </div>
    </div>
  );
};
