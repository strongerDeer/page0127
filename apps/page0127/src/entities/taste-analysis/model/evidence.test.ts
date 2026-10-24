import { describe, expect, it } from 'vitest';

import {
  EVIDENCE_MAX,
  EVIDENCE_REASON_MAX,
  toBookKey,
  toTasteEvidence,
} from './evidence';

const books = [
  { id: 'id-1', title: '데이터 삽질 끝에 UX가 보였다', cover_image: 'c1' },
  { id: 'id-2', title: '모순', cover_image: null },
  { id: 'id-3', title: '피로사회', cover_image: 'c3' },
];
const LIKED = ['UX 디자인', '관계'];

describe('toTasteEvidence', () => {
  it('번호로 책을 찾아 저장할 모양으로 바꾼다 — 제목·표지는 실제 책 것', () => {
    const [item] = toTasteEvidence(
      [
        {
          book: 'B1',
          reason: '현장에서 바로 쓰는 지식을 찾는 결',
          topics: ['UX 디자인'],
        },
      ],
      books,
      LIKED
    );
    expect(item).toEqual({
      book_id: 'id-1',
      title: '데이터 삽질 끝에 UX가 보였다',
      cover_image: 'c1',
      reason: '현장에서 바로 쓰는 지식을 찾는 결',
      topics: ['UX 디자인'],
    });
    expect(toBookKey(0)).toBe('B1');
  });

  it('번호가 없으면 제목으로 찾는다 — 띄어쓰기·부호 차이는 같은 책', () => {
    const result = toTasteEvidence(
      [{ title: '데이터 삽질 끝에, UX가 보였다!', reason: '결' }],
      books,
      LIKED
    );
    expect(result.map((e) => e.book_id)).toEqual(['id-1']);
  });

  it('목록에 없는 책(지어낸 책)·중복·빈 이유는 버린다', () => {
    const result = toTasteEvidence(
      [
        { book: 'B9', reason: '없는 번호' },
        { title: '존재하지 않는 책', reason: '지어낸 제목' },
        { book: 'B2', reason: '첫 번째' },
        { book: 'b2', reason: '같은 책 또' },
        { book: 'B3', reason: '   ' },
      ],
      books,
      LIKED
    );
    expect(result.map((e) => [e.book_id, e.reason])).toEqual([
      ['id-2', '첫 번째'],
    ]);
  });

  it('주제는 좋아하는 주제에 있는 것만, 겹치지 않게', () => {
    const [item] = toTasteEvidence(
      [
        {
          book: 'B2',
          reason: '결',
          topics: ['관계', ' 관계 ', '없는 주제', 3],
        },
      ],
      books,
      LIKED
    );
    expect(item.topics).toEqual(['관계']);
  });

  it('최대 권수와 이유 길이를 지킨다', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      id: `id-${i}`,
      title: `책 ${i}`,
      cover_image: null,
    }));
    const result = toTasteEvidence(
      many.map((_, i) => ({ book: toBookKey(i), reason: '가'.repeat(100) })),
      many,
      []
    );
    expect(result).toHaveLength(EVIDENCE_MAX);
    expect([...result[0].reason]).toHaveLength(EVIDENCE_REASON_MAX);
    expect(result[0].reason.endsWith('…')).toBe(true);
  });

  it('모양이 이상하면 빈 배열 — 분석 저장은 막지 않는다', () => {
    expect(toTasteEvidence(undefined, books, LIKED)).toEqual([]);
    expect(toTasteEvidence({ book: 'B1' }, books, LIKED)).toEqual([]);
    expect(toTasteEvidence([null, 'B1', 42], books, LIKED)).toEqual([]);
  });
});
