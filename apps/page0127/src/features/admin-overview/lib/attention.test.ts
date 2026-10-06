import { describe, expect, it } from 'vitest';

import { buildAttention } from './attention';

describe('buildAttention', () => {
  it('처리할 게 없으면 빈 목록 (0 건 줄을 만들지 않는다)', () => {
    expect(
      buildAttention({
        pendingReports: 0,
        qualityRegressions: 0,
        aiBudgetPercent: 40,
      })
    ).toEqual([]);
  });

  it('조회 실패(null)는 문제로 만들지 않는다', () => {
    expect(
      buildAttention({
        pendingReports: 0,
        qualityRegressions: null,
        aiBudgetPercent: null,
      })
    ).toEqual([]);
  });

  it('신고 → 품질 → AI 순서, 예산은 80% 부터 경고·100% 부터 위험', () => {
    const items = buildAttention({
      pendingReports: 2,
      qualityRegressions: 1,
      aiBudgetPercent: 85,
    });
    expect(items.map((i) => [i.key, i.tone])).toEqual([
      ['reports', 'danger'],
      ['quality', 'warn'],
      ['ai', 'warn'],
    ]);
    expect(
      buildAttention({
        pendingReports: 0,
        qualityRegressions: 0,
        aiBudgetPercent: 120,
      })[0].tone
    ).toBe('danger');
  });
});
