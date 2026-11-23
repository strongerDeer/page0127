import { describe, expect, it } from 'vitest';

import {
  absoluteImageUrl,
  formatStoryDate,
  formatStoryShortDate,
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
