import { describe, expect, it } from 'vitest';

import { buildChapters, neighborsOf } from './chapters';

describe('buildChapters', () => {
  it('비회원은 맛보기를 포함한 네 장, 마지막은 "맺음"', () => {
    const chapters = buildChapters({ withPreview: true });
    expect(chapters.map((c) => [c.id, c.label, c.folio])).toEqual([
      ['why', '제1장', 1],
      ['first-impression', '제2장', 2],
      ['highlights', '제3장', 3],
      ['closing', '맺음', 4],
    ]);
  });

  it('회원은 맛보기가 빠지고 번호가 당겨진다', () => {
    const chapters = buildChapters({ withPreview: false });
    expect(chapters.map((c) => [c.id, c.label])).toEqual([
      ['why', '제1장'],
      ['highlights', '제2장'],
      ['closing', '맺음'],
    ]);
  });

  it('앵커는 섹션 id 와 겹치지 않게 접두사를 붙인다', () => {
    const [first] = buildChapters({ withPreview: true });
    expect(first.anchor).toBe('book-ch-why');
  });
});

describe('neighborsOf', () => {
  const chapters = buildChapters({ withPreview: true });

  it('첫 장은 앞이 없고, 마지막 장은 뒤가 없다', () => {
    expect(neighborsOf(chapters, 'why').prev).toBeNull();
    expect(neighborsOf(chapters, 'why').next?.id).toBe('first-impression');
    expect(neighborsOf(chapters, 'closing').next).toBeNull();
    expect(neighborsOf(chapters, 'closing').prev?.id).toBe('highlights');
  });

  it('목록에 없는 장(회원의 맛보기)은 앞뒤가 없다', () => {
    const member = buildChapters({ withPreview: false });
    expect(neighborsOf(member, 'first-impression')).toEqual({
      prev: null,
      next: null,
    });
  });
});
