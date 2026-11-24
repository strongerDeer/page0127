import { describe, expect, it } from 'vitest';

import { toTasteBannerDescription } from './featureBanner';

const base = {
  unlocked: true,
  booksToUnlock: 0,
  lastAnalyzedAt: null,
  remaining: 3,
  bookLabel: '평가한 완독 책',
};

describe('toTasteBannerDescription', () => {
  it('5권 전이면 남은 권수를 말한다', () => {
    expect(
      toTasteBannerDescription({ ...base, unlocked: false, booksToUnlock: 2 })
    ).toBe('평가한 완독 책이 2권 더 모이면 볼 수 있어요');
  });

  it('분석 이력이 있으면 날짜(한국 시간)와 남은 횟수', () => {
    // UTC 11/15 15:30 = KST 11/16 00:30
    expect(
      toTasteBannerDescription({
        ...base,
        lastAnalyzedAt: '2026-11-15T15:30:00Z',
      })
    ).toBe('11월 16일 분석 · 이번 달 3번 남음');
  });

  it('첫 분석 전이면 무엇을 하는지와 남은 횟수', () => {
    expect(toTasteBannerDescription(base)).toBe(
      '평가한 완독 책으로 독서 성향을 읽어 줘요 · 이번 달 3번 남음'
    );
  });
});
