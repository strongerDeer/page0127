import { describe, expect, it } from 'vitest';

import { createCompatibilityPrompt } from './compatibility';

describe('createCompatibilityPrompt', () => {
  it('책 정보만 포함하고 사용자 식별정보 입력을 요구하지 않는다', () => {
    const prompt = createCompatibilityPrompt({
      // 픽스처는 도메인이 실제로 만드는 값만 쓴다 (0,1,2,3,4,5,10).
      // 이전 픽스처의 9·8은 DB에 존재할 수 없는 값이었다.
      user1Books: [
        {
          title: '첫 번째 책',
          author: '저자 A',
          category: '소설',
          rating: 10,
        },
      ],
      user2Books: [
        {
          title: '두 번째 책',
          author: '저자 B',
          category: '인문',
          rating: 4,
        },
      ],
    });

    expect(prompt).toContain('"첫 번째 책"');
    expect(prompt).toContain('"두 번째 책"');
    expect(prompt).toContain('실명·닉네임을 추정하거나 만들어 내지 마세요');
    expect(prompt).not.toContain('nickname');
    expect(prompt).not.toContain('email');
  });

  it('평점을 5점 만점으로 접어 전달한다 (10 = 인생책 → 만점, 0 = 평가 안 함)', () => {
    const prompt = createCompatibilityPrompt({
      user1Books: [
        { title: '인생책', author: 'A', category: '소설', rating: 10 },
        { title: '평가 안 한 책', author: 'B', category: '소설', rating: 0 },
      ],
      user2Books: [
        { title: '보통 책', author: 'C', category: '인문', rating: 3 },
      ],
    });

    // 10은 11번째 점수가 아니라 최고점의 별칭이다
    expect(prompt).toContain('별점 5/5');
    expect(prompt).toContain('별점 3/5');
    // 0을 "0/5"로 넘기면 모델이 "최악의 책"으로 읽는다
    expect(prompt).toContain('별점 평가 안 함');
    expect(prompt).not.toContain('/10');
  });
});
