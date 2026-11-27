import { describe, expect, it } from 'vitest';

import {
  absoluteImageUrl,
  formatStoryDate,
  formatStoryShortDate,
  isBookReview,
  storyKindLabel,
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

describe('글 종류', () => {
  it('책을 연결한 독후감만 "책 한 권"', () => {
    expect(storyKindLabel({ bookId: 'b', isReview: true })).toBe('책 한 권');
    expect(isBookReview({ bookId: 'b', isReview: true })).toBe(true);
  });

  it('책을 연결해도 독후감이 아니면 "독서 이야기"(필사 소개 글)', () => {
    expect(storyKindLabel({ bookId: 'b', isReview: false })).toBe(
      '독서 이야기'
    );
    expect(isBookReview({ bookId: 'b', isReview: false })).toBe(false);
  });

  it('책 없는 글은 늘 "독서 이야기"', () => {
    expect(storyKindLabel({ bookId: null, isReview: true })).toBe(
      '독서 이야기'
    );
  });
});
