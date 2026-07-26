import { describe, expect, it } from 'vitest';

import { createCompatibilityPrompt } from './compatibility';

describe('createCompatibilityPrompt', () => {
  it('책 정보만 포함하고 사용자 식별정보 입력을 요구하지 않는다', () => {
    const prompt = createCompatibilityPrompt({
      // score는 프롬프트 경계의 타입 — 호출부(라우트)가 이미 5점 만점으로 접어서 넘긴다.
      // 이전 픽스처의 rating 9·8은 DB에도, 이 경계에도 존재할 수 없는 값이었다.
      user1Books: [
        {
          title: '첫 번째 책',
          author: '저자 A',
          category: '소설',
          score: 5,
        },
      ],
      user2Books: [
        {
          title: '두 번째 책',
          author: '저자 B',
          category: '인문',
          score: 4,
        },
      ],
    });

    expect(prompt).toContain('"첫 번째 책"');
    expect(prompt).toContain('"두 번째 책"');
    expect(prompt).toContain('실명·닉네임을 추정하거나 만들어 내지 마세요');
    expect(prompt).not.toContain('nickname');
    expect(prompt).not.toContain('email');
  });

  it('점수를 5점 만점으로 표기하고 평가 안 함(score = null)은 점수로 적지 않는다', () => {
    const prompt = createCompatibilityPrompt({
      // 호출부가 rating 10(인생책) → score 5, rating 0(평가 안 함) → score null 로 접는다
      user1Books: [
        { title: '인생책', author: 'A', category: '소설', score: 5 },
        { title: '평가 안 한 책', author: 'B', category: '소설', score: null },
      ],
      user2Books: [
        { title: '보통 책', author: 'C', category: '인문', score: 3 },
      ],
    });

    expect(prompt).toContain('별점 5/5');
    expect(prompt).toContain('별점 3/5');
    // null을 "0/5"로 적으면 모델이 "최악의 책"으로 읽는다
    expect(prompt).toContain('별점 평가 안 함');
    // 옛 `/10` 척도가 되살아나지 않도록 잠근다
    expect(prompt).not.toContain('/10');
  });
});
