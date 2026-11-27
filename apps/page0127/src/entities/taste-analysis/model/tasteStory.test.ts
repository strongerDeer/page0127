import { describe, expect, it } from 'vitest';

import { firstSentence, pickShareableEvidence } from './tasteStory';

import type { TasteEvidence } from '../types';

const book = (id: string): TasteEvidence => ({
  book_id: id,
  title: `책 ${id}`,
  cover_image: null,
  reason: '이유',
  topics: ['관계'],
});

describe('firstSentence', () => {
  it('첫 문장까지만 자른다', () => {
    expect(
      firstSentence('사람 사이의 결을 오래 붙잡는 독자예요. 두 번째 문장입니다.')
    ).toBe('사람 사이의 결을 오래 붙잡는 독자예요.');
  });

  it('줄바꿈으로 이어진 문장도 자르고 공백을 정리한다', () => {
    expect(firstSentence('  첫 문장이에요!\n\n둘째 문장  ')).toBe('첫 문장이에요!');
  });

  it('소수점처럼 뒤에 공백이 없는 마침표에서는 자르지 않는다', () => {
    expect(firstSentence('평균 3.5권을 읽어요. 다음')).toBe('평균 3.5권을 읽어요.');
  });

  it('끝 표시가 없으면 통째로 돌려준다', () => {
    expect(firstSentence('마침표 없는 설명')).toBe('마침표 없는 설명');
  });
});

describe('pickShareableEvidence', () => {
  it('공개 책만 앞에서부터 세 권 남긴다', () => {
    const evidence = ['a', 'b', 'c', 'd', 'e'].map(book);
    const picked = pickShareableEvidence(evidence, new Set(['a', 'c', 'd', 'e']));
    expect(picked.map((item) => item.book_id)).toEqual(['a', 'c', 'd']);
  });

  it('공개 책이 없으면 빈 배열 — 이미지는 설명만 그린다', () => {
    expect(pickShareableEvidence([book('a')], new Set())).toEqual([]);
  });
});
