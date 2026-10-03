import { afterEach, describe, expect, it, vi } from 'vitest';

import { getKakaoAlertConfig, KakaoAlertConfigError } from './kakaoApi';

describe('getKakaoAlertConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('모두 있으면 콜백 주소까지 만들어 돌려준다', () => {
    vi.stubEnv('KAKAO_ALERT_REST_API_KEY', 'rest');
    vi.stubEnv('KAKAO_ALERT_CLIENT_SECRET', 'secret');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://page0127.com');

    expect(getKakaoAlertConfig().redirectUri).toBe(
      'https://page0127.com/api/admin/kakao-alert/callback'
    );
  });

  it('빠지면 빠진 이름들을 들고 실패한다 — 라우트가 화면에 보여 줄 수 있게', () => {
    vi.stubEnv('KAKAO_ALERT_REST_API_KEY', '');
    vi.stubEnv('KAKAO_ALERT_CLIENT_SECRET', '');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://page0127.com');

    try {
      getKakaoAlertConfig();
      expect.unreachable('실패해야 한다');
    } catch (e) {
      expect(e).toBeInstanceOf(KakaoAlertConfigError);
      expect((e as KakaoAlertConfigError).missing).toEqual([
        'KAKAO_ALERT_REST_API_KEY',
        'KAKAO_ALERT_CLIENT_SECRET',
      ]);
    }
  });
});
