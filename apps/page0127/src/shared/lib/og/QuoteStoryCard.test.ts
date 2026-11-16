import { describe, expect, it } from 'vitest';

import { toQuoteLines } from './QuoteStoryCard';

describe('toQuoteLines (문장 카드 글자 크기·줄)', () => {
  it('짧은 문장은 가장 큰 글자로', () => {
    const { size, lines } = toQuoteLines('읽는 사람은 자란다.');
    expect(size).toBe(60);
    expect(lines).toEqual(['읽는 사람은 자란다.']);
  });

  it('길어질수록 글자를 줄여 더 많은 줄을 싣는다', () => {
    const { size } = toQuoteLines('아주 긴 문장이 이어집니다. '.repeat(6));
    expect(size).toBeLessThan(60);
  });

  it('최대 길이(200자) 문장도 말줄임 없이 들어간다', () => {
    const text = '가나다라마 바사아자차 '.repeat(18).trim().slice(0, 200);
    const { lines } = toQuoteLines(text);
    expect(lines.at(-1)?.endsWith('…')).toBe(false);
  });
});
