import { describe, expect, it } from 'vitest';

import { titleLines } from './BookStoryCard';

describe('titleLines (책 스토리 큰 제목)', () => {
  it('한 줄에 들어가면 그대로 한 줄', () => {
    expect(titleLines('대온실 수리 보고서')).toEqual(['대온실 수리 보고서']);
  });

  it('두 줄이면 한 단어만 떨어지지 않게 폭을 맞춰 나눈다', () => {
    expect(titleLines('평범하지만 부자가 되고 싶어')).toEqual([
      '평범하지만',
      '부자가 되고 싶어',
    ]);
  });

  it('두 줄을 넘으면 둘째 줄 끝을 말줄임한다', () => {
    const lines = titleLines(
      '아주 길고 긴 제목이 계속 이어져서 두 줄로는 도저히 다 담을 수 없는 아주 아주 긴 책 제목'
    );
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
  });
});
