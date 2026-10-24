import { describe, expect, it } from 'vitest';

import { balanceLines } from './balanceLines';

describe('balanceLines', () => {
  it('한 줄에 들어가면 그대로', () => {
    expect(balanceLines('세상을 넓히는 사람', 10)).toEqual([
      '세상을 넓히는 사람',
    ]);
  });

  it('두 줄이면 폭이 비슷한 곳에서 나눈다 — 한 단어만 떨어지지 않는다', () => {
    expect(balanceLines('내일의 나를 준비하는 사람', 10)).toEqual([
      '내일의 나를',
      '준비하는 사람',
    ]);
    expect(balanceLines('쉬지 않고 페이지를 넘기는 사람', 10)).toEqual([
      '쉬지 않고 페이지를',
      '넘기는 사람',
    ]);
  });

  it('정해 둔 줄바꿈이 있으면 그 자리에서만 나눈다', () => {
    expect(balanceLines('책장을 보면,\n그 사람이 보인다.', 5)).toEqual([
      '책장을 보면,',
      '그 사람이 보인다.',
    ]);
  });

  it('띄어쓰기가 없으면 나누지 않는다', () => {
    expect(balanceLines('가나다라마바사아자차카타', 5)).toEqual([
      '가나다라마바사아자차카타',
    ]);
  });
});
