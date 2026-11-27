import { describe, expect, it } from 'vitest';

import {
  findBodyImageSrcs,
  isAllowedImageSrc,
  readImageSize,
  withImageSize,
} from './bodyImage';

const SUPABASE = 'https://abc.supabase.co';
const BUCKET = `${SUPABASE}/storage/v1/object/public/story-images`;

describe('isAllowedImageSrc', () => {
  it('우리 버킷 파일과 public/images/stories 만, 크기 # 는 있어도 된다', () => {
    expect(isAllowedImageSrc(`${BUCKET}/a1-b2.webp`, SUPABASE)).toBe(true);
    expect(isAllowedImageSrc(`${BUCKET}/a1-b2.png#1200x630`, SUPABASE)).toBe(
      true
    );
    expect(isAllowedImageSrc('/images/stories/a/b.webp#10x10', SUPABASE)).toBe(
      true
    );
  });

  it('외부 주소·다른 버킷·경로 넘어가기는 막는다', () => {
    expect(isAllowedImageSrc('https://evil.com/x.webp', SUPABASE)).toBe(false);
    expect(isAllowedImageSrc(`${BUCKET}/../avatars/x.webp`, SUPABASE)).toBe(
      false
    );
    expect(isAllowedImageSrc(`${BUCKET}/x.svg`, SUPABASE)).toBe(false);
    expect(isAllowedImageSrc(`${BUCKET}/x.webp`, undefined)).toBe(false);
  });
});

describe('그림 크기 #가로x세로', () => {
  it('붙이고 읽는다 — 이미 있던 # 는 갈아 끼운다', () => {
    const src = withImageSize(`${BUCKET}/a.webp#1x1`, {
      width: 1200,
      height: 630,
    });
    expect(src).toBe(`${BUCKET}/a.webp#1200x630`);
    expect(readImageSize(src)).toEqual({ width: 1200, height: 630 });
    expect(readImageSize(`${BUCKET}/a.webp`)).toBeNull();
  });
});

describe('findBodyImageSrcs', () => {
  it('본문 속 마크다운 그림 주소를 모두 찾는다', () => {
    expect(
      findBodyImageSrcs(
        '글 ![하나](/images/stories/a.webp) 그리고\n\n![둘](<https://x.com/b.png> "캡션")\n[링크](https://y.com)'
      )
    ).toEqual(['/images/stories/a.webp', 'https://x.com/b.png']);
  });
});
