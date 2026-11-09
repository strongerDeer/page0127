import { describe, expect, it } from 'vitest';

import { formatSentenceSource } from './sentenceSource';

describe('formatSentenceSource', () => {
  it('있는 칸만 순서대로 잇는다', () => {
    expect(
      formatSentenceSource({
        book_title: '책',
        author: '저자',
        translator: '옮긴이',
        page: 12,
      })
    ).toBe('《책》 · 저자 · 옮긴이 옮김 · p. 12');
  });

  it('제목만 있어도 된다', () => {
    expect(
      formatSentenceSource({
        book_title: '책',
        author: null,
        translator: null,
        page: null,
      })
    ).toBe('《책》');
  });
});
