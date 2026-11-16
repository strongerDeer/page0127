import { describe, expect, it } from 'vitest';

import { balancedWrap, balanceLines } from './balanceLines';

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

describe('balancedWrap', () => {
  it('두 줄이 되면 마지막 한 단어만 떨어지지 않게 나눈다', () => {
    expect(
      balancedWrap('같은 방향을 보며 걷지만 각자의 속도가 있는 사이예요', 20, 3)
    ).toEqual(['같은 방향을 보며 걷지만', '각자의 속도가 있는 사이예요']);
  });

  it('세 줄 이상이면 앞에서부터 채우고 줄 수에서 자른다', () => {
    const lines = balancedWrap('가나 다라 마바 사아 자차 카타 파하', 5, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
  });
});
