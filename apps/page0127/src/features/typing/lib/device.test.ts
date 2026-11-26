import { describe, expect, it } from 'vitest';

import { deviceFromHeaders } from './device';

const from = (headers: Record<string, string>) => (name: string) =>
  headers[name] ?? null;

describe('필사 기기 판정', () => {
  it('Sec-CH-UA-Mobile 이 있으면 그것을 따른다', () => {
    expect(deviceFromHeaders(from({ 'sec-ch-ua-mobile': '?1' }))).toBe(
      'mobile'
    );
    expect(
      deviceFromHeaders(
        from({ 'sec-ch-ua-mobile': '?0', 'user-agent': 'iPhone' })
      )
    ).toBe('pc');
  });

  it('없으면 User-Agent 로 본다', () => {
    expect(
      deviceFromHeaders(
        from({
          'user-agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
        })
      )
    ).toBe('mobile');
    expect(
      deviceFromHeaders(
        from({
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
        })
      )
    ).toBe('pc');
    expect(deviceFromHeaders(from({}))).toBe('pc');
  });
});
