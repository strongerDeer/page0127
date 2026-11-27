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

  it('책 없는 글은 bookId null·제목 빈칸, 첫 숫자(lead_stat)를 읽는다', () => {
    const story = toStory({
      ...row,
      book_id: null,
      book_title: '',
      map_image: null,
      lead_stat: { value: 38.5, unit: '%', label: '성인', people: 3.85 },
    });
    expect(story.bookId).toBeNull();
    expect(story.bookTitle).toBe('');
    expect(story.leadStat).toEqual({
      value: 38.5,
      unit: '%',
      label: '성인',
      people: 3.85,
    });
  });

  it('lead_stat 모양이 틀리면 null', () => {
    expect(
      toStory({ ...row, map_image: null, lead_stat: { value: 'x' } }).leadStat
    ).toBeNull();
  });

  it('대표 이미지·위치·글 종류 — 없으면 기본값(마이그레이션 전 행도 그대로)', () => {
    const story = toStory({ ...row, map_image: null });
    expect(story.coverImage).toBeNull();
    expect(story.coverPosition).toBe('50% 50%');
    expect(story.isReview).toBe(true);
  });

  it('대표 이미지·위치를 읽고, 틀린 위치는 가운데로', () => {
    const cover = {
      src: '/images/stories/c.webp',
      width: 1200,
      height: 630,
      alt: '표지',
    };
    const story = toStory({
      ...row,
      map_image: null,
      cover_image: cover,
      cover_position: '20% 0%',
      is_review: false,
    });
    expect(story.coverImage).toEqual(cover);
    expect(story.coverPosition).toBe('20% 0%');
    expect(story.isReview).toBe(false);
    expect(
      toStory({ ...row, map_image: null, cover_position: 'left; color: red' })
        .coverPosition
    ).toBe('50% 50%');
  });

  it('공유용 그림은 cover_image.share 에서 읽는다', () => {
    const share = {
      src: '/images/stories/s.webp',
      width: 1200,
      height: 630,
      alt: '',
    };
    const story = toStory({
      ...row,
      map_image: null,
      cover_image: {
        src: '/images/stories/c.webp',
        width: 10,
        height: 10,
        alt: '',
        share,
      },
    });
    expect(story.shareImage).toEqual(share);
    expect(story.coverImage?.src).toBe('/images/stories/c.webp');
    expect(toStory({ ...row, map_image: null }).shareImage).toBeNull();
  });
});
