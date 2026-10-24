import { describe, expect, it } from 'vitest';

import { textWidth } from './theme';
import { wrapLines } from './wrapLines';

describe('wrapLines', () => {
  it('한 줄에 들어가면 그대로', () => {
    expect(wrapLines('다시 읽고 싶은 책', 10, 3)).toEqual([
      '다시 읽고 싶은 책',
    ]);
  });

  it('띄어쓰기에서 나눈다 — 어절이 중간에 끊기지 않는다', () => {
    expect(wrapLines('읽는 내내 마음이 따뜻해지는 책이었다', 10, 3)).toEqual([
      '읽는 내내 마음이',
      '따뜻해지는 책이었다',
    ]);
  });

  it('줄 수를 넘으면 마지막 줄 끝에 말줄임표', () => {
    const lines = wrapLines('하나 둘 셋 넷 다섯 여섯 일곱 여덟 아홉 열', 5, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
    lines.forEach((line) => expect(textWidth(line)).toBeLessThanOrEqual(5));
  });

  it('한 줄보다 긴 어절은 글자 단위로 자른다', () => {
    const lines = wrapLines('띄어쓰기없이아주길게이어지는문장', 5, 5);
    expect(lines.join('')).toBe('띄어쓰기없이아주길게이어지는문장');
    lines.forEach((line) => expect(textWidth(line)).toBeLessThanOrEqual(5));
  });

  it('줄바꿈·연속 공백은 띄어쓰기 하나로 본다', () => {
    expect(wrapLines('  좋았다\n\n정말   좋았다 ', 20, 3)).toEqual([
      '좋았다 정말 좋았다',
    ]);
  });

  it('빈 문장은 빈 배열', () => {
    expect(wrapLines('   ', 10, 3)).toEqual([]);
  });
});
