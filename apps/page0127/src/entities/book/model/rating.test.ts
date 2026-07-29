import { describe, expect, it } from 'vitest';

import { averageScore, isRated, isTopRated, summarizeRatings } from './rating';

describe('rating', () => {
  it('0과 null은 평가로 세지 않는다', () => {
    // 0은 점수가 아니라 "평가 안 함"이다
    expect(isRated(null)).toBe(false);
    expect(isRated(0)).toBe(false);
    expect(isRated(1)).toBe(true);
    expect(isRated(5)).toBe(true);
  });

  it('최고 평가는 5점과 인생책 둘 다다', () => {
    expect(isTopRated(5, false)).toBe(true);
    expect(isTopRated(5, true)).toBe(true);
    // 인생책이면 점수와 무관하게 최고 평가다
    expect(isTopRated(3, true)).toBe(true);
    expect(isTopRated(4, false)).toBe(false);
    expect(isTopRated(0, false)).toBe(false);
    expect(isTopRated(null, false)).toBe(false);
  });

  it('평균은 평가 안 함을 빼고 계산한다', () => {
    // 0이 섞여도 평균을 끌어내리지 않는다
    expect(averageScore([0, 5])).toBe(5);
    expect(averageScore([null, 5])).toBe(5);
    expect(averageScore([5, 4])).toBe(4.5);
    // 소수 1자리로 반올림: (5 + 4 + 4) / 3 = 4.333...
    expect(averageScore([5, 4, 4])).toBe(4.3);
  });

  it('평균 대상이 없으면 0을 반환한다', () => {
    expect(averageScore([])).toBe(0);
    expect(averageScore([0])).toBe(0);
    expect(averageScore([null, 0])).toBe(0);
  });

  describe('summarizeRatings', () => {
    it('평균과 권수가 같은 모집단을 쓴다 (0·null 제외)', () => {
      // 평가에 드는 값은 5, 4, 4 → (5 + 4 + 4) / 3 = 4.33... → 4.3, 3권
      const summary = summarizeRatings([5, 4, 4, 0, null]);

      expect(summary).toEqual({ average: 4.3, ratedCount: 3 });
    });

    it('빈 목록과 평가 없는 목록은 둘 다 0으로 요약한다', () => {
      expect(summarizeRatings([])).toEqual({ average: 0, ratedCount: 0 });
      expect(summarizeRatings([0, null, 0])).toEqual({
        average: 0,
        ratedCount: 0,
      });
    });
  });
});
