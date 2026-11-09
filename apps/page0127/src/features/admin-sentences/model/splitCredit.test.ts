import { describe, expect, it } from 'vitest';

import { splitCredit } from './splitCredit';

describe('splitCredit', () => {
  it('저자와 옮긴이를 나눈다', () => {
    expect(splitCredit('알베르 카뮈 저/김화영 역')).toEqual({
      author: '알베르 카뮈',
      translator: '김화영',
    });
  });

  it('옮긴이가 없으면 저자만', () => {
    expect(splitCredit('한강 저')).toEqual({ author: '한강', translator: '' });
  });

  it('그림·감수는 뺀다', () => {
    expect(splitCredit('생텍쥐페리 글/김화영 옮김/홍길동 그림')).toEqual({
      author: '생텍쥐페리',
      translator: '김화영',
    });
  });

  it('모르는 모양이면 통째로 저자에', () => {
    expect(splitCredit(' 작자 미상 ')).toEqual({
      author: '작자 미상',
      translator: '',
    });
  });
});
