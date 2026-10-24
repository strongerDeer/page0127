import { describe, expect, it } from 'vitest';

import {
  isCrowdCount,
  RANKING_CROWD_MIN,
  rankingFallbackTitle,
  toRankingTitle,
} from './rankingTitle';

const counts = (...values: number[]) => values.map((count) => ({ count }));

describe('toRankingTitle', () => {
  it('1위가 기준 인원 미만이면 규모 대신 화자를 말한다', () => {
    expect(toRankingTitle('most', counts(3, 2, 1))).toBe('리더들이 완독한 책');
    expect(toRankingTitle('best', counts(9))).toBe('리더들이 고른 인생책');
  });

  it('1위가 기준 인원에 닿으면 원래 제목으로 돌아간다', () => {
    expect(toRankingTitle('most', counts(RANKING_CROWD_MIN, 4))).toBe(
      '많이 읽힌 책'
    );
    expect(toRankingTitle('best', counts(4, 25))).toBe(
      '가장 많은 사람의 인생책'
    );
  });

  it('어느 제목에도 기간을 붙이지 않는다 — most 는 누적 완독 수다', () => {
    const titles = [
      toRankingTitle('most', counts(1)),
      toRankingTitle('most', counts(50)),
    ];
    titles.forEach((title) => expect(title).not.toMatch(/이번 주|오늘|요즘/));
  });

  it('빈 랭킹은 얇은 쪽 제목이다', () => {
    expect(toRankingTitle('most', [])).toBe('리더들이 완독한 책');
  });
});

describe('isCrowdCount · rankingFallbackTitle', () => {
  it('근거 수치는 제목 복귀와 같은 기준에서만 적는다', () => {
    expect(isCrowdCount(RANKING_CROWD_MIN - 1)).toBe(false);
    expect(isCrowdCount(RANKING_CROWD_MIN)).toBe(true);
  });

  it('데이터를 모를 때(에러 화면)는 규모를 주장하지 않는다', () => {
    expect(rankingFallbackTitle('most')).toBe('리더들이 완독한 책');
    expect(rankingFallbackTitle('best')).toBe('리더들이 고른 인생책');
  });
});
