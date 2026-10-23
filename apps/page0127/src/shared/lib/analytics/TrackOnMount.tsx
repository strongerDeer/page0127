'use client';

import { useEffect, useRef } from 'react';

import { type AnalyticsEvent, trackEvent } from './trackEvent';

type TrackOnMountProps = {
  event: AnalyticsEvent;
  params?: Record<string, unknown>;
};

/**
 * 마운트될 때 이벤트를 한 번 보낸다. 화면에는 아무것도 그리지 않는다.
 *
 * 서버 컴포넌트 섹션 옆에 두면 "이 섹션을 봤다"를 섹션 코드를 건드리지 않고 셀 수 있다.
 * StrictMode 는 개발에서 effect 를 두 번 돌리므로 ref 로 한 번만 보낸다.
 */
export const TrackOnMount = ({ event, params }: TrackOnMountProps) => {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackEvent(event, params);
  }, [event, params]);

  return null;
};
