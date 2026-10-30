import { describe, expect, it } from 'vitest';

import { detectInstallPlatform } from './installPlatform';

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipadSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  iphoneKakao:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  macChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  winEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  macFirefox:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:131.0) Gecko/20100101 Firefox/131.0',
};

const detect = (userAgent: string, maxTouchPoints = 0, isStandalone = false) =>
  detectInstallPlatform({ userAgent, maxTouchPoints, isStandalone });

describe('detectInstallPlatform', () => {
  it('이미 홈 화면 앱으로 열려 있으면 기기와 상관없이 installed', () => {
    expect(detect(UA.iphoneSafari, 5, true)).toBe('installed');
    expect(detect(UA.androidChrome, 5, true)).toBe('installed');
  });

  it('아이폰 사파리는 ios', () => {
    expect(detect(UA.iphoneSafari, 5)).toBe('ios');
  });

  it('맥 UA 라도 터치가 되면 아이패드로 본다', () => {
    expect(detect(UA.ipadSafari, 5)).toBe('ios');
    expect(detect(UA.ipadSafari, 0)).toBe('desktop-safari');
  });

  it('앱 안 브라우저는 OS 보다 먼저 in-app', () => {
    expect(detect(UA.iphoneKakao, 5)).toBe('in-app');
  });

  it('안드로이드 크롬은 android', () => {
    expect(detect(UA.androidChrome, 5)).toBe('android');
  });

  it('PC 크롬·엣지는 desktop-chromium', () => {
    expect(detect(UA.macChrome)).toBe('desktop-chromium');
    expect(detect(UA.winEdge)).toBe('desktop-chromium');
  });

  it('PC 파이어폭스는 설치를 지원하지 않는다', () => {
    expect(detect(UA.macFirefox)).toBe('unsupported');
  });
});
