import { describe, expect, it } from 'vitest';

import { getStoryByBookId, getStoryBySlug, STORIES } from './stories';

/**
 * 책 이야기는 코드로 등록한다 — 사람이 손으로 적는 목록이라 실수를 여기서 잡는다.
 * (주소가 겹치거나, 책 하나에 이야기가 둘이면 책 정보 페이지 카드가 어느 쪽인지 모른다)
 */
describe('책 이야기 목록', () => {
  it('slug 는 주소로 쓸 수 있는 영문 소문자·숫자·하이픈이고 겹치지 않는다', () => {
    const slugs = STORIES.map((s) => s.slug);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('책 하나에 이야기는 하나다', () => {
    const bookIds = STORIES.map((s) => s.bookId);
    expect(new Set(bookIds).size).toBe(bookIds.length);
  });

  it('날짜는 YYYY-MM-DD, 별점은 0~5', () => {
    for (const story of STORIES) {
      expect(story.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(story.rating).toBeGreaterThanOrEqual(0);
      expect(story.rating).toBeLessThanOrEqual(5);
    }
  });

  it('그림은 public/stories 의 로컬 파일이고 alt 가 있다(이미지 검색용)', () => {
    for (const story of STORIES) {
      const images = [story.characterMap.full, ...story.characterMap.cards];
      for (const image of images) {
        expect(image.src.startsWith('/stories/')).toBe(true);
        expect(image.alt.length).toBeGreaterThan(10);
      }
    }
  });

  it('slug·책 id 로 찾는다', () => {
    const [first] = STORIES;
    expect(getStoryBySlug(first.slug)?.bookId).toBe(first.bookId);
    expect(getStoryByBookId(first.bookId)?.slug).toBe(first.slug);
    expect(getStoryBySlug('없는-이야기')).toBeNull();
  });
});
