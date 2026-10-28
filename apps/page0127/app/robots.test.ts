import { describe, expect, it } from 'vitest';

import robots from './robots';

describe('robots', () => {
  it('공개 도서 경로를 허용하고 보호 경로는 차단한다', () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(rules.allow).toEqual(
      expect.arrayContaining(['/books/all', '/books/info/'])
    );
    expect(rules.disallow).toEqual(
      expect.arrayContaining([
        '/books$',
        '/books/',
        '/api/',
        '/settings$',
        '/admin/',
        '/dashboard/',
        '/library/manage$',
        '/onboarding$',
        '/auth/',
        '/*/*/edit$',
        '/*/compatibility$',
      ])
    );
    // 로그인 화면의 noindex는 크롤러가 읽을 수 있어야 한다.
    expect(rules.disallow).not.toContain('/login');
  });
});
