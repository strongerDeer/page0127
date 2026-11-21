'use client';

import { useState } from 'react';

import { Button } from '@repo/ui';
import { BookOpen, Loader2 } from 'lucide-react';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

/**
 * 로그인 화면의 「체험 계정으로 둘러보기」.
 *
 * 평범한 form POST 다(/api/auth/demo). 서버가 세션 쿠키를 심고 303 으로 서재에 보낸다.
 * JS 가 늦게 받아져도 버튼은 동작한다 — 클라이언트 컴포넌트인 건 누른 뒤 스피너와 이벤트 때문이다.
 */
export const DemoLoginButton = ({ failed }: { failed?: boolean }) => {
  const [pending, setPending] = useState(false);

  return (
    <form
      action='/api/auth/demo'
      method='post'
      onSubmit={() => {
        setPending(true);
        trackEvent('login_start', { method: 'demo' });
      }}
      className='space-y-2'
    >
      <Button
        type='submit'
        variant='outline'
        className='h-12 w-full gap-2'
        disabled={pending}
      >
        {pending ? (
          <Loader2 className='size-4 animate-spin' aria-hidden />
        ) : (
          <BookOpen className='size-4' aria-hidden />
        )}
        체험 계정으로 둘러보기
      </Button>
      <p className='text-center text-xs text-balance break-keep text-text-subtle'>
        가입 없이 책 20권이 담긴 예시 서재와 통계·AI 취향 분석을 볼 수 있어요.
        저장은 되지 않아요.
      </p>
      {failed && (
        <p role='alert' className='text-center text-xs text-destructive'>
          체험 계정에 들어가지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}
    </form>
  );
};
