import { describe, expect, it } from 'vitest';

import {
  countQuoteChars,
  parseQuoteInput,
  QUOTE_MAX_LENGTH,
} from './quoteInput';

describe('countQuoteChars', () => {
  it('이모지를 한 글자로 센다 — Postgres char_length 와 같은 기준', () => {
    expect('😀'.length).toBe(2);
    expect(countQuoteChars('😀')).toBe(1);
    expect(countQuoteChars('밑줄 😀')).toBe(4);
  });
});

describe('parseQuoteInput', () => {
  it('앞뒤 공백을 지우고 문장 안 줄바꿈은 살린다', () => {
    expect(parseQuoteInput('  첫 줄\r\n둘째 줄  ', '')).toEqual({
      ok: true,
      value: { text: '첫 줄\n둘째 줄', page: null },
    });
  });

  it('빈 문장은 막는다', () => {
    expect(parseQuoteInput('   ', '').ok).toBe(false);
    expect(parseQuoteInput(null, '').ok).toBe(false);
  });

  it(`${QUOTE_MAX_LENGTH}자까지 받고 넘으면 막는다`, () => {
    const max = '가'.repeat(QUOTE_MAX_LENGTH);
    expect(parseQuoteInput(max, '').ok).toBe(true);
    expect(parseQuoteInput(`${max}가`, '').ok).toBe(false);
  });

  it('이모지가 섞여도 코드 포인트로 200자면 통과한다', () => {
    const text = '😀'.repeat(QUOTE_MAX_LENGTH);
    expect(text.length).toBe(QUOTE_MAX_LENGTH * 2);
    expect(parseQuoteInput(text, '').ok).toBe(true);
  });

  it('쪽수는 비워도 되고, 숫자면 정수로 바꾼다', () => {
    expect(parseQuoteInput('문장', ' 123 ')).toEqual({
      ok: true,
      value: { text: '문장', page: 123 },
    });
  });

  it('쪽수가 숫자가 아니거나 범위를 벗어나면 막는다', () => {
    expect(parseQuoteInput('문장', '12쪽').ok).toBe(false);
    expect(parseQuoteInput('문장', '0').ok).toBe(false);
    expect(parseQuoteInput('문장', '1.5').ok).toBe(false);
    expect(parseQuoteInput('문장', '100000').ok).toBe(false);
  });
});
