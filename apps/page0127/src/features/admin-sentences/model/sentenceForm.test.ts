import { describe, expect, it } from 'vitest';

import { parseSentenceForm, SENTENCE_MAX_LENGTH } from './sentenceForm';

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

describe('parseSentenceForm', () => {
  it('공백을 다듬고 빈 칸은 null 로 바꾼다', () => {
    expect(
      parseSentenceForm(
        form({
          text: '  첫 줄\r\n둘째 줄 ',
          book_title: ' 책 ',
          author: '',
          translator: ' ',
          page: '12',
          isbn: '',
          rights_note: '저작권 만료',
        })
      )
    ).toEqual({
      ok: true,
      value: {
        text: '첫 줄\n둘째 줄',
        book_title: '책',
        author: null,
        translator: null,
        page: 12,
        isbn: null,
        rights_note: '저작권 만료',
      },
    });
  });

  it('문장과 책 제목은 꼭 있어야 한다', () => {
    expect(parseSentenceForm(form({ text: '', book_title: '책' })).ok).toBe(
      false
    );
    expect(parseSentenceForm(form({ text: '문장', book_title: '' })).ok).toBe(
      false
    );
  });

  it(`문장은 ${SENTENCE_MAX_LENGTH}자까지`, () => {
    const max = '가'.repeat(SENTENCE_MAX_LENGTH);
    expect(parseSentenceForm(form({ text: max, book_title: '책' })).ok).toBe(
      true
    );
    expect(
      parseSentenceForm(form({ text: `${max}가`, book_title: '책' })).ok
    ).toBe(false);
  });

  it('쪽수가 숫자가 아니면 막는다', () => {
    expect(
      parseSentenceForm(form({ text: '문장', book_title: '책', page: '12쪽' }))
        .ok
    ).toBe(false);
  });
});
