import { describe, expect, it } from 'vitest';

import { buildChapters, neighborsOf } from './chapters';

describe('buildChapters', () => {
  it('비회원(A)은 시안 순서대로 여덟 장 — 맛보기가 책 고르기·내 책장 두 쪽', () => {
    const chapters = buildChapters({ preview: 'a' });
    expect(chapters.map((c) => [c.id, c.label, c.folio])).toEqual([
      ['why', '제1장', 1],
      ['pick', '제2장', 2],
      ['shelf', '제3장', 3],
      ['sentence', '제4장', 4],
      ['share', '제5장', 5],
      ['chem', '제6장', 6],
      ['badge', '제7장', 7],
      ['lounge', '제8장', 8],
    ]);
  });

  it('인생책 찾기(B)는 맛보기가 한 쪽', () => {
    const chapters = buildChapters({ preview: 'b' });
    expect(chapters.map((c) => c.id)).toEqual([
      'why',
      'pick',
      'sentence',
      'share',
      'chem',
      'badge',
      'lounge',
    ]);
    expect(chapters[1].title).toBe('당신의 인생책');
  });

  it('회원은 맛보기가 빠지고 번호가 당겨진다', () => {
    const chapters = buildChapters({ preview: null });
    expect(chapters.map((c) => [c.id, c.label])).toEqual([
      ['why', '제1장'],
      ['sentence', '제2장'],
      ['share', '제3장'],
      ['chem', '제4장'],
      ['badge', '제5장'],
      ['lounge', '제6장'],
    ]);
  });

  it('앵커는 섹션 id 와 겹치지 않게 접두사를 붙인다', () => {
    const [first] = buildChapters({ preview: 'a' });
    expect(first.anchor).toBe('book-ch-why');
  });
});

describe('neighborsOf', () => {
  const chapters = buildChapters({ preview: 'a' });

  it('첫 장은 앞이 없고, 마지막 장은 뒤가 없다', () => {
    expect(neighborsOf(chapters, 'why').prev).toBeNull();
    expect(neighborsOf(chapters, 'why').next?.id).toBe('pick');
    expect(neighborsOf(chapters, 'lounge').next).toBeNull();
    expect(neighborsOf(chapters, 'lounge').prev?.id).toBe('badge');
  });

  it('목록에 없는 장(회원의 맛보기)은 앞뒤가 없다', () => {
    const member = buildChapters({ preview: null });
    expect(neighborsOf(member, 'pick')).toEqual({ prev: null, next: null });
  });
});
