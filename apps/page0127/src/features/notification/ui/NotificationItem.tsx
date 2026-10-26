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

import { Button } from '@repo/ui';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui';
import {
  BookOpen,
  Check,
  Heart,
  type LucideIcon,
  Mail,
  MessageCircle,
  Pointer,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react';

import { RelativeTime } from '@/shared/ui/RelativeTime';

import {
  type NotificationWithActor,
  SELF_NOTICE_TYPES,
  toActorSentence,
} from '@/entities/notification';
import { BookEnvelopeArtwork } from '@/entities/notification/ui/BookEnvelopeArtwork';
import { toDisplayName, toInitial } from '@/entities/profile/model/displayName';

type NotificationItemProps = {
  notification: NotificationWithActor;
  onClick: () => void;
  onDelete?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
};

export const NotificationItem = ({
  notification,
  onClick,
  onDelete,
  onMarkAsRead,
}: NotificationItemProps) => {
  const { type, actor, is_read, created_at } = notification;
  // 나에게 오는 알림 — "OO님이 …" 대신 크론이 적어 둔 문장을 그대로 보여 준다
  const isSelfNotice = SELF_NOTICE_TYPES.includes(type);

  // 다른 사람이 보낸 알림의 문장 — 책 제목·답글 여부를 넣는다(푸시와 같은 문장)
  const actorSentence = toActorSentence(type, notification.target) ?? '';

  // 알림 타입별 메시지 및 아이콘
  const getNotificationContent = (): {
    Icon: LucideIcon | null;
    iconColor: string;
    message: string;
  } => {
    // 알림 타입별 의미 색은 차트 팔레트로 (인디고 베이스 + 보조 파스텔)
    switch (type) {
      case 'reading_nudge':
        return {
          Icon: Pointer,
          iconColor: 'text-primary',
          message: `${actorSentence}${notification.message ? ` · “${notification.message}”` : ''}${notification.target?.title ? ` · 『${notification.target.title}』` : ''}`,
        };
      case 'follow':
        return {
          Icon: UserPlus,
          iconColor: 'text-chart-1',
          message: actorSentence,
        };
      case 'comment':
        return {
          Icon: MessageCircle,
          iconColor: 'text-chart-3',
          message: actorSentence,
        };
      case 'like':
        return {
          Icon: Heart,
          iconColor: 'text-chart-5',
          message: actorSentence,
        };
      case 'reading_reminder':
        return {
          Icon: BookOpen,
          iconColor: 'text-primary',
          message: notification.message ?? '오래 읽고 있는 책이 있어요',
        };
      case 'weekly_recap':
        return {
          Icon: Sparkles,
          iconColor: 'text-primary',
          message: notification.message ?? '이번 주 회상이 도착했어요',
        };
      default:
        return {
          Icon: null,
          iconColor: '',
          message: '',
        };
    }
  };

  const { Icon, iconColor, message } = getNotificationContent();
  // 나에게 오는 알림은 프로필 자리에 타입 아이콘을 크게 두므로 본문 앞 아이콘은 생략한다
  const SelfNoticeIcon = Icon ?? BookOpen;
  // nickname은 미설정이면 null이라 그대로 쓰면 "님이 팔로우했습니다"처럼 이름이 빈다
  const actorName = toDisplayName(actor);

  if (type === 'reading_nudge') {
    return (
      <div
        className={`flex w-full gap-2 border-b p-3 ${!is_read ? 'bg-accent' : ''}`}
      >
        <button
          onClick={onClick}
          className='flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left'
        >
          <span className='shrink-0' aria-hidden='true'>
            <BookEnvelopeArtwork compact />
          </span>
          <span className='min-w-0 space-y-1'>
            <span className='flex items-center gap-1.5 text-xs font-medium text-primary'>
              <Mail size={14} aria-hidden='true' />
              {is_read ? '열어본 책 봉투' : '책 봉투가 도착했어요'}
            </span>
            <span className='block break-all text-sm font-medium'>
              {actorName}님이 보내셨습니다.
            </span>
            <span className='block text-xs text-text-subtle'>
              봉투 열어보기 ↗
            </span>
            <RelativeTime
              date={created_at}
              className='block text-xs text-text-subtle'
            />
          </span>
        </button>
        <div className='flex shrink-0 flex-col items-center gap-1'>
          {!is_read && onMarkAsRead && (
            <Button
              variant='ghost'
              size='icon-sm'
              aria-label='읽음 처리'
              onClick={() => onMarkAsRead(notification.id)}
            >
              <Check size={16} />
            </Button>
          )}
          {onDelete && (
            <Button
              variant='ghost'
              size='icon-sm'
              aria-label='삭제'
              onClick={() => onDelete(notification.id)}
            >
              <X size={16} />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex w-full items-start gap-3 border-b p-4 transition-colors ${
        !is_read ? 'bg-accent' : ''
      }`}
    >
      {/* 프로필 이미지 — 나에게 오는 알림은 내 얼굴 대신 알림 타입 아이콘 */}
      {isSelfNotice ? (
        <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10'>
          <SelfNoticeIcon className='h-5 w-5 text-primary' />
        </span>
      ) : (
        <Avatar className='h-10 w-10'>
          <AvatarImage src={actor.photo_url || undefined} alt={actorName} />
          <AvatarFallback>{toInitial(actor)}</AvatarFallback>
        </Avatar>
      )}

      {/* 알림 내용 - 클릭 가능 영역 */}
      <button onClick={onClick} className='flex-1 space-y-1 text-left'>
        <div className='flex items-center gap-2'>
          {!isSelfNotice && Icon && (
            <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
          )}
          <p className='text-sm'>
            {!isSelfNotice && <span className='font-medium'>{actorName}</span>}
            {message}
          </p>
        </div>
        <RelativeTime date={created_at} className='text-xs text-text-subtle' />
      </button>

      {/* 액션 버튼 영역 */}
      <div className='flex items-center gap-1'>
        {/* 읽지 않은 알림 표시 및 읽음 처리 버튼 */}
        {!is_read ? (
          <>
            <div className='h-2 w-2 rounded-full bg-primary'></div>
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
};
