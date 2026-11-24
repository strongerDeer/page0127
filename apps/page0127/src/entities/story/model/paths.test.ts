import { describe, expect, it } from 'vitest';

import {
  absoluteImageUrl,
  formatStoryDate,
  formatStoryShortDate,
  storyShareImagePath,
} from './paths';

describe('책 이야기 날짜·주소', () => {
  it('UTC 저녁에 공개해도 한국 날짜로 보인다', () => {
    // 2026-11-23 15:30 UTC = 11월 24일 00:30 KST
    expect(formatStoryDate('2026-11-23T15:30:00Z')).toBe('2026년 11월 24일');
    expect(formatStoryShortDate('2026-11-23T15:30:00Z')).toBe('2026.11.24');
  });

  it('상대 경로에만 사이트 주소를 붙인다', () => {
    expect(absoluteImageUrl('/images/a.webp', 'https://x.com')).toBe(
      'https://x.com/images/a.webp'
    );
    expect(absoluteImageUrl('https://s.co/a.webp', 'https://x.com')).toBe(
      'https://s.co/a.webp'
    );
  });
});

describe('storyShareImagePath', () => {
  it('수정 시각을 붙여 저장할 때마다 주소가 바뀐다', () => {
    expect(storyShareImagePath('a', '2026-11-24T01:00:00Z')).toBe(
      '/blog/a/share-image?v=1795482000000'
    );
    expect(storyShareImagePath('a', '2026-11-24T02:00:00Z')).not.toBe(
      storyShareImagePath('a', '2026-11-24T01:00:00Z')
    );
  });

  it('시각을 못 읽으면 버전 없이', () => {
    expect(storyShareImagePath('a', '')).toBe('/blog/a/share-image');
  });
});
