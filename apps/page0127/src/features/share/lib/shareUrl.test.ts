import { describe, expect, it } from 'vitest';

import { buildShareUrl } from './shareUrl';

describe('buildShareUrl', () => {
  it('짧은 공유 표시 하나만 붙인다', () => {
    expect(buildShareUrl('https://page0127.com', '/stronger_deer')).toBe(
      'https://page0127.com/stronger_deer?from=share'
    );
  });

  it('원래 있던 쿼리는 남긴다', () => {
    const url = new URL(
      buildShareUrl('https://page0127.com', '/a/b?tab=review')
    );
    expect(url.searchParams.get('tab')).toBe('review');
    expect(url.searchParams.get('from')).toBe('share');
  });
});
