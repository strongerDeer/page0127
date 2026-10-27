import { describe, expect, it } from 'vitest';

import { buildShareUrl, shareKindOf } from './shareUrl';

describe('shareKindOf', () => {
  it('경로 모양으로 서재·책을 가른다', () => {
    expect(shareKindOf('/stronger_deer')).toBe('library');
    expect(shareKindOf('/stronger_deer/9c93e4f0')).toBe('book');
  });
});

describe('buildShareUrl', () => {
  it('공유 꼬리표를 붙인다', () => {
    const url = new URL(
      buildShareUrl('https://page0127.com', '/stronger_deer', 'native')
    );
    expect(url.pathname).toBe('/stronger_deer');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      utm_source: 'share',
      utm_medium: 'social',
      utm_campaign: 'share_library',
      utm_content: 'native',
    });
  });

  it('원래 있던 쿼리는 남긴다', () => {
    const url = new URL(
      buildShareUrl('https://page0127.com', '/a/b?tab=review', 'copy')
    );
    expect(url.searchParams.get('tab')).toBe('review');
    expect(url.searchParams.get('utm_campaign')).toBe('share_book');
  });
});
