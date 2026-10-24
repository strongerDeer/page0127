'use client';

import { Button } from '@repo/ui';
import { ExternalLink, Link2 } from 'lucide-react';
import { toast } from 'sonner';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';
import { externalOpenUrl } from '@/shared/lib/auth/inAppBrowser';

import type { InAppApp, InAppBrowser } from '@/shared/lib/auth/inAppBrowser';

const APP_NAME: Record<InAppApp, string> = {
  instagram: '인스타그램',
  facebook: '페이스북',
  threads: '스레드',
  kakaotalk: '카카오톡',
  naver: '네이버',
  line: '라인',
  other: '앱',
};

type InAppBrowserNoticeProps = {
  browser: NonNullable<InAppBrowser>;
};

/**
 * 앱 안 브라우저에서 로그인 화면을 열었을 때 외부 브라우저로 안내한다.
 * 판정과 이유는 shared/lib/auth/inAppBrowser.ts 참고.
 *
 * 주소는 누르는 순간의 window.location 을 쓴다 — ?redirect= 가 그대로 따라가야
 * 외부 브라우저에서 로그인한 뒤에도 하려던 곳으로 돌아간다.
 */
export const InAppBrowserNotice = ({ browser }: InAppBrowserNoticeProps) => {
  const appName = APP_NAME[browser.app];

  const handleOpen = () => {
    const target = externalOpenUrl(browser, window.location.href);
    if (!target) return;
    trackEvent('cta_click', {
      location: 'in_app_notice',
      label: 'open_external',
    });
    window.location.href = target;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('링크를 복사했어요. 사파리나 크롬에 붙여 넣어 주세요.');
    } catch {
      toast.error(
        '복사하지 못했어요. 주소창의 링크를 길게 눌러 복사해 주세요.'
      );
    }
  };

  const canOpenDirectly =
    externalOpenUrl(browser, 'https://example.com') !== null;

  return (
    <div
      role='status'
      className='space-y-3 rounded-xl border border-line bg-sunken p-4 text-sm break-keep'
    >
      <p className='font-medium text-text-strong'>
        {appName} 안에서는 구글 로그인이 막혀 있어요
      </p>
      {canOpenDirectly ? (
        <p className='text-text-subtle'>
          아래 버튼으로 브라우저에서 열면 구글·카카오 모두 바로 로그인할 수
          있어요.
        </p>
      ) : (
        <p className='text-text-subtle'>
          오른쪽 위 <strong>···</strong> 메뉴에서{' '}
          <strong>&lsquo;외부 브라우저에서 열기&rsquo;</strong>를 눌러 주세요.
          카카오 로그인은 여기서도 돼요.
        </p>
      )}
      <div className='flex flex-wrap gap-2'>
        {canOpenDirectly && (
          <Button type='button' size='sm' onClick={handleOpen}>
            <ExternalLink aria-hidden className='size-4' />
            브라우저로 열기
          </Button>
        )}
        <Button type='button' size='sm' variant='outline' onClick={handleCopy}>
          <Link2 aria-hidden className='size-4' />
          링크 복사
        </Button>
      </div>
    </div>
  );
};
