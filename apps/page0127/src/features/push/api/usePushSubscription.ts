'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { apiClient } from '@/shared/api/client';

import {
  detectPushSupport,
  isIosUserAgent,
  type PushSupport,
  urlBase64ToUint8Array,
} from '../model/pushSupport';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

// apiClient 의 baseURL 이 '/api' 라 여기서는 붙이지 않는다 (붙이면 /api/api/... 로 404)
const SUBSCRIPTIONS_URL = '/push/subscriptions';

const readSupport = (): PushSupport =>
  detectPushSupport({
    hasVapidKey: VAPID_PUBLIC_KEY.length > 0,
    hasServiceWorker: 'serviceWorker' in navigator,
    hasPushManager: 'PushManager' in window,
    hasNotification: 'Notification' in window,
    isIos: isIosUserAgent(navigator.userAgent, navigator.maxTouchPoints),
    isStandalone:
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS 사파리 전용 플래그 — 옛 버전은 display-mode 미디어쿼리에 답하지 않는다
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    permission: 'Notification' in window ? Notification.permission : null,
  });

// 지원 여부는 페이지가 떠 있는 동안 바뀌지 않는다(권한 변화는 enable 이 직접 반영한다)
const subscribeNothing = () => () => {};

/**
 * 서비스워커 등록을 기다린다. ServiceWorkerRegistrar 가 등록하지 않는 환경(next dev)에서
 * ready 를 기다리면 영영 끝나지 않으므로, 등록이 없으면 여기서 한다.
 */
const getRegistration = async (): Promise<ServiceWorkerRegistration> => {
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) return existing;
  return navigator.serviceWorker.register('/sw.js', {
    scope: '/',
    updateViaCache: 'none',
  });
};

/**
 * 이 기기의 웹푸시 켜기·끄기.
 *
 * 켜져 있는지는 **브라우저의 구독**이 정답이다(서버 행은 기기 수만큼 있다).
 * 화면을 열 때 구독이 있으면 서버에 한 번 더 알린다 — 계정을 바꿔 로그인했거나
 * 서버가 만료로 지운 경우를 여기서 맞춘다.
 */
export const usePushSubscription = () => {
  // 서버 렌더에서는 navigator 가 없으므로 null(판정 전) — 하이드레이션 뒤 브라우저 값으로 바뀐다
  const detected = useSyncExternalStore(
    subscribeNothing,
    readSupport,
    () => null
  );
  // 권한을 물은 뒤 바뀐 판정(예: 거부 → denied)
  const [override, setOverride] = useState<PushSupport | null>(null);
  const support = override ?? detected;
  const [isSubscribed, setIsSubscribed] = useState(false);
  // 구독 여부를 브라우저에서 한 번 읽었는가 — 읽기 전에 '꺼짐'으로 보고 권유 카드를 띄우면 깜빡인다
  const [isChecked, setIsChecked] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (support !== 'available') return;

    let cancelled = false;
    void (async () => {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      if (cancelled) return;
      setIsSubscribed(Boolean(subscription));
      setIsChecked(true);
      if (subscription) {
        // 실패해도 화면은 '켜짐' 그대로 둔다 — 다음 방문 때 다시 맞춘다
        await apiClient
          .post(SUBSCRIPTIONS_URL, subscription.toJSON())
          .catch(() => {});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [support]);

  /** 반드시 버튼 클릭 안에서 부른다 — iOS 는 사용자 동작 없이 권한을 물으면 거절한다 */
  const enable = useCallback(async (): Promise<PushSupport | 'ok'> => {
    setIsPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        const next = readSupport();
        setOverride(next);
        return next === 'available' ? 'denied' : next;
      }

      const registration = await getRegistration();
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          // 받은 푸시는 반드시 화면에 띄운다(조용한 푸시 금지) — 크롬·사파리 모두 필수 조건
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

      await apiClient.post(SUBSCRIPTIONS_URL, subscription.toJSON());
      setIsSubscribed(true);
      return 'ok';
    } finally {
      setIsPending(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setIsPending(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        // 서버를 먼저 지운다 — 브라우저 구독을 먼저 끊으면 endpoint 를 잃어 서버 행이 남는다
        await apiClient.delete(SUBSCRIPTIONS_URL, {
          data: { endpoint: subscription.endpoint },
        });
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
    } finally {
      setIsPending(false);
    }
  }, []);

  return { support, isSubscribed, isChecked, isPending, enable, disable };
};
