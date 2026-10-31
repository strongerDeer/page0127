'use client';

import { useState } from 'react';

import { Button, cn } from '@repo/ui';
import { BellRing } from 'lucide-react';
import { toast } from 'sonner';

import { useLocalStorage } from '@/shared/lib/hooks/useLocalStorage';

import { usePushSubscription } from '../api/usePushSubscription';

/** "나중에"를 누르면 이만큼은 다시 묻지 않는다 */
const SNOOZE_MS = 1000 * 60 * 60 * 24 * 14;
const SNOOZE_KEY = 'push-prompt-snoozed-at';

/**
 * 브라우저 알림 권한을 묻기 전에 우리 화면에서 먼저 묻는 카드(soft-ask).
 *
 * 왜 바로 Notification.requestPermission() 을 띄우지 않나:
 * 브라우저 권한 창은 사실상 한 번뿐이다. "차단"을 누르면 사이트가 다시 물을 수 없고
 * 사용자가 브라우저 설정에서 직접 풀어야 한다. 그래서 [켜기]를 누른 사람에게만 권한 창을 띄운다.
 *
 * 보여 주는 조건: 이 기기에서 켤 수 있고(available) · 아직 구독 전이고 · 최근에 "나중에"를 누르지 않음.
 * iOS 사파리 탭(needs-install)·거부(denied)·미지원은 카드 대신 설정 화면 안내에 맡긴다.
 */
export const PushPromptCard = ({ className }: { className?: string }) => {
  const { support, isSubscribed, isChecked, isPending, enable } =
    usePushSubscription();
  const [snoozedAt, setSnoozedAt] = useLocalStorage<number | null>(
    SNOOZE_KEY,
    null
  );

  // 렌더 중 Date.now() 는 순수하지 않다 — 화면을 연 시각을 한 번만 잡아 둔다
  const [openedAt] = useState(() => Date.now());
  const snoozed = snoozedAt !== null && openedAt - snoozedAt < SNOOZE_MS;
  if (support !== 'available' || !isChecked || isSubscribed || snoozed) {
    return null;
  }

  // 반드시 클릭 핸들러 안에서 권한을 묻는다 — iOS 는 사용자 동작 없이 물으면 거절한다
  const handleEnable = async () => {
    try {
      const result = await enable();
      if (result === 'ok') {
        toast.success('이제 이 기기로 알림을 보내 드릴게요.');
      } else {
        // 권한 창에서 차단·닫기 — 같은 기간 동안 다시 묻지 않는다
        setSnoozedAt(Date.now());
        toast.error(
          '알림이 허용되지 않았어요. 나중에 설정에서 다시 켤 수 있어요.'
        );
      }
    } catch (error) {
      console.error('푸시 알림 설정 실패:', error);
      toast.error('푸시 알림 설정에 실패했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <section
      aria-labelledby='push-prompt-title'
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sunken px-5 py-4',
        className
      )}
    >
      <div className='flex items-start gap-3'>
        <BellRing
          aria-hidden='true'
          className='mt-0.5 size-5 shrink-0 text-text-subtle'
        />
        <div>
          <h2
            id='push-prompt-title'
            className='text-sm font-medium text-text-strong'
          >
            새 알림을 이 기기로 받아 볼까요?
          </h2>
          <p className='mt-1 text-sm text-text-subtle'>
            책 메시지·댓글·주간 회상을 앱을 닫아 두어도 알려 드려요.
          </p>
        </div>
      </div>
      <div className='flex shrink-0 gap-2'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          disabled={isPending}
          onClick={() => setSnoozedAt(Date.now())}
        >
          나중에
        </Button>
        <Button
          type='button'
          size='sm'
          disabled={isPending}
          onClick={() => void handleEnable()}
        >
          알림 켜기
        </Button>
      </div>
    </section>
  );
};
