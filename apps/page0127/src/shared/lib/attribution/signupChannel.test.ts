import { describe, expect, it } from 'vitest';

import { signupChannelLabel, toSignupChannel } from './signupChannel';

describe('toSignupChannel', () => {
  it('출처 이름으로', () => {
    expect(toSignupChannel({ source: 'instagram', medium: 'inapp' })).toBe(
      '인스타그램'
    );
    expect(toSignupChannel({ source: 'ig', medium: 'social' })).toBe(
      '인스타그램'
    );
    expect(toSignupChannel({ source: 'share', medium: 'social' })).toBe(
      '공유 링크'
    );
    expect(toSignupChannel({ source: 'direct', medium: 'none' })).toBe(
      '직접 방문'
    );
  });

  it('도메인으로', () => {
    expect(
      toSignupChannel({
        source: 'search.naver.com',
        medium: 'referral',
        referrer_host: 'search.naver.com',
      })
    ).toBe('네이버');
    expect(
      toSignupChannel({ source: 'l.instagram.com', medium: 'referral' })
    ).toBe('인스타그램');
    expect(
      toSignupChannel({ source: 'google.co.kr', medium: 'referral' })
    ).toBe('구글');
  });

  it('기록 없음·기타', () => {
    expect(toSignupChannel(null)).toBe('기록 없음');
    expect(
      signupChannelLabel({
        source: 'brunch.co.kr',
        medium: 'referral',
        referrer_host: 'brunch.co.kr',
      })
    ).toBe('기타 (brunch.co.kr)');
  });
});
