import { describe, expect, it } from 'vitest';

import { createCompatibilityPrompt } from './compatibility';

describe('createCompatibilityPrompt', () => {
  it('책 정보만 포함하고 사용자 식별정보 입력을 요구하지 않는다', () => {
    const prompt = createCompatibilityPrompt({
      user1Books: [
        {
          title: '첫 번째 책',
          author: '저자 A',
          category: '소설',
          rating: 9,
        },
      ],
      user2Books: [
        {
          title: '두 번째 책',
          author: '저자 B',
          category: '인문',
          rating: 8,
        },
      ],
    });

    expect(prompt).toContain('"첫 번째 책"');
    expect(prompt).toContain('"두 번째 책"');
    expect(prompt).toContain('실명·닉네임을 추정하거나 만들어 내지 마세요');
    expect(prompt).not.toContain('nickname');
    expect(prompt).not.toContain('email');
  });
});
