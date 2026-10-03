import { describe, expect, it } from 'vitest';

import { kakaoAlertReturnUrl } from './state';

describe('kakaoAlertReturnUrl', () => {
  const origin = 'https://page0127.com';

  it('성공이면 결과만 붙인다', () => {
    expect(kakaoAlertReturnUrl(origin, 'connected').toString()).toBe(
      'https://page0127.com/admin/errors?kakao=connected'
    );
  });

  it('환경변수 누락이면 빠진 이름들을 쉼표로 붙인다', () => {
    const url = kakaoAlertReturnUrl(origin, 'error', 'missing_env', [
      'KAKAO_ALERT_REST_API_KEY',
      'KAKAO_ALERT_CLIENT_SECRET',
    ]);
    expect(url.searchParams.get('reason')).toBe('missing_env');
    expect(url.searchParams.get('missing')).toBe(
      'KAKAO_ALERT_REST_API_KEY,KAKAO_ALERT_CLIENT_SECRET'
    );
  });

  it('빠진 이름이 없으면 missing 을 붙이지 않는다', () => {
    expect(kakaoAlertReturnUrl(origin, 'error', 'state_mismatch', []).searchParams.has('missing')).toBe(
      false
    );
  });
});
