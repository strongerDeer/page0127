import { describe, expect, it } from 'vitest';

import {
  detectPushSupport,
  isIosUserAgent,
  type PushEnvironment,
  urlBase64ToUint8Array,
} from './pushSupport';

const desktopChrome: PushEnvironment = {
  hasVapidKey: true,
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  isIos: false,
  isStandalone: false,
  permission: 'default',
};

describe('detectPushSupport', () => {
  it('데스크톱·안드로이드 크롬은 탭에서도 켤 수 있다', () => {
    expect(detectPushSupport(desktopChrome)).toBe('available');
  });

  it('서버 키가 없으면 다른 조건과 상관없이 준비 안 됨', () => {
    expect(detectPushSupport({ ...desktopChrome, hasVapidKey: false })).toBe(
      'not-configured'
    );
  });

  it('iOS 사파리 탭은 지원 안 함이 아니라 홈 화면 추가 안내', () => {
    expect(
      detectPushSupport({
        ...desktopChrome,
        isIos: true,
        hasPushManager: false,
        hasNotification: false,
      })
    ).toBe('needs-install');
  });

  it('iOS 홈 화면 앱에서는 켤 수 있다', () => {
    expect(
      detectPushSupport({ ...desktopChrome, isIos: true, isStandalone: true })
    ).toBe('available');
  });

  it('권한을 거부했으면 denied', () => {
    expect(detectPushSupport({ ...desktopChrome, permission: 'denied' })).toBe(
      'denied'
    );
  });

  it('푸시 API 가 없으면 unsupported', () => {
    expect(detectPushSupport({ ...desktopChrome, hasPushManager: false })).toBe(
      'unsupported'
    );
  });
});

describe('isIosUserAgent', () => {
  it('아이폰과, 맥으로 위장한 아이패드를 iOS 로 본다', () => {
    expect(isIosUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)', 5)).toBe(
      true
    );
    expect(
      isIosUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)
    ).toBe(true);
    expect(
      isIosUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)
    ).toBe(false);
  });
});

describe('urlBase64ToUint8Array', () => {
  it('base64url(패딩 없음)을 바이트로 되돌린다', () => {
    // 'hi?' → base64 'aGk/' → base64url 'aGk_'
    expect([...urlBase64ToUint8Array('aGk_')]).toEqual([104, 105, 63]);
  });
});
