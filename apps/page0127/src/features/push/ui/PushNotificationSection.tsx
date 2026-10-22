'use client';

import { Switch } from '@repo/ui';
import { toast } from 'sonner';

import { usePushSubscription } from '../api/usePushSubscription';

import type { PushSupport } from '../model/pushSupport';

/** 켤 수 없는 이유별 안내 — 'available' 은 스위치를 보여 주므로 문구가 없다 */
const UNAVAILABLE_COPY: Record<Exclude<PushSupport, 'available'>, string> = {
  'not-configured': '푸시 알림을 준비하고 있어요.',
  unsupported: '이 브라우저는 푸시 알림을 지원하지 않아요.',
  'needs-install':
    '아이폰·아이패드는 사파리 공유 버튼 → "홈 화면에 추가"로 설치한 앱에서 켤 수 있어요.',
  denied:
    '알림 권한이 꺼져 있어요. 브라우저(또는 기기) 설정에서 page0127. 알림을 허용해 주세요.',
};

/**
 * 설정 화면의 "푸시 알림" 섹션 — 이 기기에서 잠금화면 알림을 받을지 정한다.
 *
 * 기기 단위다. 폰에서 켜도 노트북에서는 따로 켜야 한다(브라우저마다 구독이 따로 생긴다).
 * 보내는 내용은 종 아이콘 알림과 같다 — 팔로우·좋아요·댓글·읽는 중 알림·주간 회상.
 */
export const PushNotificationSection = () => {
  const { support, isSubscribed, isPending, enable, disable } =
    usePushSubscription();

  const handleChange = async (checked: boolean) => {
    try {
      if (!checked) {
        await disable();
        toast.success('이 기기의 푸시 알림을 껐어요.');
        return;
      }
      const result = await enable();
      if (result === 'ok') {
        toast.success('이제 이 기기로 알림을 보내 드릴게요.');
      } else if (result !== 'available') {
        toast.error(UNAVAILABLE_COPY[result]);
      }
    } catch (error) {
      console.error('푸시 알림 설정 실패:', error);
      toast.error('푸시 알림 설정에 실패했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <section className='mt-6 rounded-2xl bg-sunken px-5 py-4'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h2 className='text-sm font-medium text-text-strong'>
            <label htmlFor='push-notification-switch'>푸시 알림</label>
          </h2>
          <p className='mt-1 text-sm text-text-subtle'>
            앱을 닫아 두어도 새 알림과 주간 회상을 이 기기로 받아요.
          </p>
        </div>
        {support === 'available' && (
          <Switch
            id='push-notification-switch'
            checked={isSubscribed}
            disabled={isPending}
            onCheckedChange={handleChange}
          />
        )}
      </div>

      {/* 판정 전(null)에는 비워 둔다 — 안내 문구가 깜빡였다 사라지면 더 헷갈린다 */}
      {support && support !== 'available' && (
        <p className='mt-3 text-sm text-text-subtle'>
          {UNAVAILABLE_COPY[support]}
        </p>
      )}
    </section>
  );
};
