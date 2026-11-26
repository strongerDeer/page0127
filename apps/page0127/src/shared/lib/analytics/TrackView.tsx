'use client';

import { useEffect } from 'react';

import { type AnalyticsEvent,trackEvent } from './trackEvent';

/**
 * 그려지면 이벤트를 한 번 보낸다 — 서버 컴포넌트가 "이 카드가 보였다"를 셀 때 쓴다.
 * 화면에는 아무것도 그리지 않는다. params 는 처음 값만 쓴다(다시 그려져도 다시 보내지 않게).
 */
export const TrackView = ({
  event,
  params,
}: {
  event: AnalyticsEvent;
  params?: Record<string, unknown>;
}) => {
  useEffect(() => {
    trackEvent(event, params);
    // 마운트 한 번만 — params 객체는 서버에서 매번 새로 만들어 와서 의존성에 넣으면 또 보낸다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
  return null;
};
