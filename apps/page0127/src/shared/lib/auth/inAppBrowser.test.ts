import { describe, expect, it } from 'vitest';

import { detectInAppBrowser, externalOpenUrl } from './inAppBrowser';

const UA = {
  instagramIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.0.0 (iPhone15,2; iOS 17_5; ko_KR; ko; scale=3.00; 1179x2556)',
  instagramAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36 Instagram 330.0.0.0.0 Android',
  kakaoIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.7.5',
  safari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
};

describe('detectInAppBrowser', () => {
  it('iOS 인스타 앱', () => {
    expect(detectInAppBrowser(UA.instagramIos)).toEqual({
      app: 'instagram',
      os: 'ios',
    });
  });
  it('안드로이드 인스타 앱 — 일반 웹뷰 표식보다 앱 이름이 먼저다', () => {
    expect(detectInAppBrowser(UA.instagramAndroid)).toEqual({
      app: 'instagram',
      os: 'android',
    });
  });
  it('카카오톡', () => {
    expect(detectInAppBrowser(UA.kakaoIos)).toEqual({
      app: 'kakaotalk',
      os: 'ios',
    });
  });
  it('사파리·크롬은 인앱이 아니다', () => {
    expect(detectInAppBrowser(UA.safari)).toBeNull();
    expect(detectInAppBrowser(UA.chromeAndroid)).toBeNull();
  });
  it('UA 가 없으면 null', () => {
    expect(detectInAppBrowser(null)).toBeNull();
  });
});

describe('externalOpenUrl', () => {
  const url = 'https://page0127.com/login?redirect=%2Fme';

  it('카카오톡은 openExternal 스킴', () => {
    expect(externalOpenUrl({ app: 'kakaotalk', os: 'ios' }, url)).toBe(
      `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`
    );
  });
  it('안드로이드는 크롬 intent', () => {
    expect(externalOpenUrl({ app: 'instagram', os: 'android' }, url)).toBe(
      'intent://page0127.com/login?redirect=%2Fme#Intent;scheme=https;package=com.android.chrome;end'
    );
  });
  it('iOS 인스타는 코드로 나갈 길이 없다', () => {
    expect(externalOpenUrl({ app: 'instagram', os: 'ios' }, url)).toBeNull();
  });
});
