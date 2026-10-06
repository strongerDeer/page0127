import { describe, expect, it } from 'vitest';

import { litCount, toWords } from './wordFill';

describe('toWords', () => {
  it('공백 단위로 쪼개고 강조 구간 표시를 단어마다 남긴다', () => {
    expect(
      toWords([{ text: '그래서 ' }, { text: '한곳에 꽂아', key: true }])
    ).toEqual([
      { text: '그래서', key: false },
      { text: '한곳에', key: true },
      { text: '꽂아', key: true },
    ]);
  });

  it('빈 조각과 연속 공백은 버린다', () => {
    expect(toWords([{ text: '  다   읽고 ' }, { text: '' }])).toEqual([
      { text: '다', key: false },
      { text: '읽고', key: false },
    ]);
  });
});

describe('litCount', () => {
  it('진행도만큼 단어를 켠다', () => {
    expect(litCount(0.5, 10)).toBe(5);
  });

  it('범위를 넘는 진행도는 0~전체로 자른다', () => {
    expect(litCount(-0.3, 10)).toBe(0);
    expect(litCount(1.7, 10)).toBe(10);
  });
});
