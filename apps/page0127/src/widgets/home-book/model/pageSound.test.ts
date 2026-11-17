import { describe, expect, it } from 'vitest';

import { soundForTurn } from './pageSound';

describe('soundForTurn', () => {
  it('표지를 열면 펼침, 표지로 돌아오면 덮음', () => {
    expect(soundForTurn(0, 1, 8)).toBe('open');
    expect(soundForTurn(1, 0, 8)).toBe('close');
  });

  it('마지막 장에서 뒤표지로 가면 덮음, 되돌아오면 펼침', () => {
    expect(soundForTurn(7, 8, 8)).toBe('close');
    expect(soundForTurn(8, 7, 8)).toBe('open');
  });

  it('가운데 쪽은 넘김', () => {
    expect(soundForTurn(3, 4, 8)).toBe('turn');
    expect(soundForTurn(4, 3, 8)).toBe('turn');
  });
});
