/**
 * 이 브라우저에서 웹푸시를 켤 수 있는가 — 설정 화면이 보여 줄 상태를 정한다.
 *
 * 순수 함수로 뺀 이유: 판정 재료(navigator·Notification·matchMedia)는 테스트 환경에서
 * 흉내 내기 번거롭고, 분기(특히 iOS 의 "홈 화면에 추가해야 함")는 틀리기 쉽다.
 */

export type PushSupport =
  /** 서버에 VAPID 키가 없다 (로컬·Preview 등) */
  | 'not-configured'
  /** 브라우저가 서비스워커·푸시를 지원하지 않는다 */
  | 'unsupported'
  /** iOS 사파리 탭 — 홈 화면에 추가한 앱 안에서만 푸시를 받을 수 있다 */
  | 'needs-install'
  /** 사용자가 알림 권한을 거부했다 — 브라우저 설정에서만 되돌릴 수 있다 */
  | 'denied'
  /** 켤 수 있다 (켜져 있는지는 구독 여부로 따로 본다) */
  | 'available';

export type PushEnvironment = {
  hasVapidKey: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  isIos: boolean;
  isStandalone: boolean;
  permission: NotificationPermission | null;
};

export const detectPushSupport = (env: PushEnvironment): PushSupport => {
  if (!env.hasVapidKey) return 'not-configured';

  // iOS 사파리 탭에는 PushManager·Notification 이 아예 없다. "지원 안 함"이 아니라
  // "홈 화면에 추가하면 된다"로 안내해야 하므로 지원 여부보다 먼저 본다
  if (env.isIos && !env.isStandalone) return 'needs-install';

  if (!env.hasServiceWorker || !env.hasPushManager || !env.hasNotification) {
    return 'unsupported';
  }
  if (env.permission === 'denied') return 'denied';
  return 'available';
};

/**
 * iOS 판별. iPadOS 13+ 사파리는 UA 가 맥(Macintosh)으로 나오므로 터치 지원으로 가른다.
 */
export const isIosUserAgent = (userAgent: string, maxTouchPoints: number) =>
  /iPad|iPhone|iPod/.test(userAgent) ||
  (/Macintosh/.test(userAgent) && maxTouchPoints > 1);

/**
 * VAPID 공개키(base64url) → pushManager.subscribe 가 받는 바이트 배열
 */
export const urlBase64ToUint8Array = (
  base64Url: string
): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
};
