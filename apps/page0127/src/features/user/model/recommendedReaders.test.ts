import { describe, expect, it } from 'vitest';

import { type CoverRow, orderRecommended } from './recommendedReaders';

const row = (userId: string, cover: string | null = null): CoverRow => ({
  user_id: userId,
  cover_image: cover,
});

describe('orderRecommended', () => {
  it('제작자를 맨 앞에 두고, 나머지는 최근 기록 순으로 한 번씩', () => {
    const result = orderRecommended({
      recentRows: [row('a'), row('b'), row('a'), row('maker'), row('c')],
      featuredId: 'maker',
      featuredRows: [],
      limit: 10,
    });
    expect(result.map((r) => [r.userId, r.featured])).toEqual([
      ['maker', true],
      ['a', false],
      ['b', false],
      ['c', false],
    ]);
  });

  it('로그인한 본인은 뺀다 — 본인이 제작자여도', () => {
    const result = orderRecommended({
      recentRows: [row('me'), row('a')],
      featuredId: 'me',
      featuredRows: [row('me', 'x')],
      excludeId: 'me',
      limit: 10,
    });
    expect(result.map((r) => r.userId)).toEqual(['a']);
  });

  it('제작자를 못 찾았으면(null) 최근 리더만', () => {
    const result = orderRecommended({
      recentRows: [row('a'), row('b')],
      featuredId: null,
      featuredRows: [],
      limit: 10,
    });
    expect(result.map((r) => r.userId)).toEqual(['a', 'b']);
  });

  it('limit 은 제작자를 포함한 인원이다', () => {
    const result = orderRecommended({
      recentRows: [row('a'), row('b'), row('c')],
      featuredId: 'maker',
      featuredRows: [],
      limit: 2,
    });
    expect(result.map((r) => r.userId)).toEqual(['maker', 'a']);
  });

  it('표지는 사람마다 최대 3개, 빈 값·중복(재독) 없이', () => {
    const [reader] = orderRecommended({
      recentRows: [
        row('a', 'p1'),
        row('a', null),
        row('a', 'p1'),
        row('a', 'p2'),
        row('a', 'p3'),
        row('a', 'p4'),
      ],
      featuredId: null,
      featuredRows: [],
      limit: 10,
    });
    expect(reader.covers.map((c) => c.src)).toEqual(['p1', 'p2', 'p3']);
  });

  it('표지마다 대체 주소(Storage 사본)를 함께 넘긴다', () => {
    const [reader] = orderRecommended({
      recentRows: [{ user_id: 'a', cover_image: 'y1', cover_fallback: 's1' }],
      featuredId: null,
      featuredRows: [],
      limit: 10,
    });
    expect(reader.covers).toEqual([{ src: 'y1', fallbackSrc: 's1' }]);
  });

  it('제작자 표지는 따로 받아 온 행에서 채운다', () => {
    const [maker] = orderRecommended({
      recentRows: [row('a', 'p1')],
      featuredId: 'maker',
      featuredRows: [row('maker', 'm1'), row('maker', 'm2')],
      limit: 10,
    });
    expect(maker).toEqual({
      userId: 'maker',
      featured: true,
      covers: [
        { src: 'm1', fallbackSrc: null },
        { src: 'm2', fallbackSrc: null },
      ],
    });
  });
});
