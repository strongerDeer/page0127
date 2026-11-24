import { describe, expect, it } from 'vitest';

import { countSentencesByMonth } from './sentenceMonthCounts';

describe('countSentencesByMonth', () => {
  it('적은 문장과 펼친 오늘의 문장을 달별로 합쳐 센다', () => {
    expect(
      countSentencesByMonth({
        quoteCreatedAts: ['2026-11-03T01:00:00Z', '2026-10-20T05:00:00Z'],
        drawDates: ['2026-11-10', '2026-11-11'],
      })
    ).toEqual({ '2026-11': 3, '2026-10': 1 });
  });

  it('적은 시각은 한국 시간 기준 달로 센다 — UTC 10/31 15시는 한국 11/1', () => {
    expect(
      countSentencesByMonth({
        quoteCreatedAts: ['2026-10-31T15:30:00Z'],
        drawDates: [],
      })
    ).toEqual({ '2026-11': 1 });
  });
});
