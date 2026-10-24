'use client';

import { useEffect, useRef } from 'react';

import { usePathname, useSearchParams } from 'next/navigation';

import { trackEvent } from '@/shared/lib/analytics/trackEvent';

import { readSignupMethod, SIGNUP_WELCOME_PARAM } from '../model/signupWelcome';

/**
 * 온보딩 완료 직후 서재에 도착하면 GA4 `sign_up` 을 한 번 보낸다.
 *
 * 화면에 아무것도 그리지 않는다(effect 전용).
 * 보낸 뒤 주소에서 표시를 지운다 — 새로고침·뒤로가기로 다시 세지 않게.
 * router.replace 대신 history.replaceState 를 쓰는 이유: 서버 컴포넌트를
 * 다시 불러오지 않고 주소만 고친다(Next 가 useSearchParams 와 동기화한다).
 */
export const SignupTracker = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const method = readSignupMethod(searchParams.get(SIGNUP_WELCOME_PARAM));
  const sent = useRef(false);

  useEffect(() => {
    if (method === null || sent.current) return;
    sent.current = true;

    trackEvent('sign_up', { method });

    const params = new URLSearchParams(window.location.search);
    params.delete(SIGNUP_WELCOME_PARAM);
    const query = params.toString();
    window.history.replaceState(
      null,
      '',
      `${pathname}${query ? `?${query}` : ''}${window.location.hash}`
    );
  }, [method, pathname]);

  return null;
};
