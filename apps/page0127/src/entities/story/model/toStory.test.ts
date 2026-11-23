import { describe, expect, it } from 'vitest';

import { toStory } from './toStory';

const row = {
  id: 'id-1',
  slug: 'a',
  book_id: 'book-1',
  book_title: '책',
  book_author: null,
  title: '제목',
  description: null,
  rating: null,
  published_at: '2026-11-23T00:00:00Z',
  updated_at: '2026-11-23T01:00:00Z',
};

describe('toStory', () => {
  it('JSONB 칸 모양이 틀린 항목은 버리고 페이지를 살린다', () => {
    const story = toStory({
      ...row,
      map_image: { src: '/images/stories/a.webp', width: 'x', height: 1 },
      map_cards: [
        { src: '/images/stories/b.webp', width: 10, height: 20, alt: '카드' },
        'garbage',
      ],
      characters: [
        { name: '묶음', people: [{ name: '영두' }, { role: '이름 없음' }] },
        { name: '빈 묶음', people: [] },
        null,
      ],
      body: null,
    });
    expect(story.mapImage).toBeNull();
    expect(story.mapCards).toHaveLength(1);
    expect(story.characters).toEqual([
      { name: '묶음', people: [{ name: '영두', role: '' }] },
    ]);
    expect(story.body).toBe('');
    expect(story.author).toBe('');
    expect(story.rating).toBe(0);
  });
});
