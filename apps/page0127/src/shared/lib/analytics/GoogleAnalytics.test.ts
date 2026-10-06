import { describe, expect, it } from 'vitest';

import { MEASUREMENT_UA_PATTERN } from './GoogleAnalytics';

describe('MEASUREMENT_UA_PATTERN', () => {
  it('Lighthouse·헤드리스 크롬은 측정 도구로 본다', () => {
    expect(
      MEASUREMENT_UA_PATTERN.test(
        'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse'
      )
    ).toBe(true);
    expect(
      MEASUREMENT_UA_PATTERN.test(
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0.0.0 Safari/537.36'
      )
    ).toBe(true);
  });

  it('일반 사용자 브라우저는 그대로 보낸다', () => {
    expect(
      MEASUREMENT_UA_PATTERN.test(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
      )
    ).toBe(false);
    expect(
      MEASUREMENT_UA_PATTERN.test(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
      )
    ).toBe(false);
  });
});
