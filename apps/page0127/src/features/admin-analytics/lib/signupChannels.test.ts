import { describe, expect, it } from 'vitest';

import { countSignupChannels } from './signupChannels';

describe('countSignupChannels', () => {
  it('채널별로 세고, 기록 없음은 맨 아래', () => {
    const attrs = new Map([
      ['a', { source: 'instagram', medium: 'inapp' }],
      ['b', { source: 'instagram', medium: 'social' }],
      [
        'c',
        {
          source: 'search.naver.com',
          medium: 'referral',
          referrer_host: 'search.naver.com',
        },
      ],
    ]);
    expect(countSignupChannels(['x', 'y', 'a', 'b', 'c'], attrs)).toEqual([
      { channel: '인스타그램', count: 2 },
      { channel: '네이버', count: 1 },
      { channel: '기록 없음', count: 2 },
    ]);
  });
});
