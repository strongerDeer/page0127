import { describe, expect, it } from 'vitest';

import { groupTasteHistory } from './groupTasteHistory';

// RPC 는 최신순으로 준다 — 실제 운영 이력(2026-10-13 스크린샷)과 같은 모양
const HISTORY = [
  {
    id: 'd',
    personality_type: '내일의 나를 준비하는 사람',
    created_at: '2026-10-07T00:00:00Z',
    analyzed_books_count: 100,
  },
  {
    id: 'c',
    personality_type: '내일의 나를 준비하는 사람',
    created_at: '2026-07-29T00:00:00Z',
    analyzed_books_count: 100,
  },
  {
    id: 'b',
    personality_type: '한 우물을 깊이 파는 사람',
    created_at: '2026-07-21T02:00:00Z',
    analyzed_books_count: 40,
  },
  {
    id: 'a',
    personality_type: '한 우물을 깊이 파는 사람',
    created_at: '2026-07-21T01:00:00Z',
    analyzed_books_count: 146,
  },
];

describe('groupTasteHistory', () => {
  it('연속된 같은 성향을 묶어 오래된 → 최신 순으로', () => {
    expect(groupTasteHistory(HISTORY)).toEqual([
      {
        personalityType: '한 우물을 깊이 파는 사람',
        count: 2,
        startedAt: '2026-07-21T01:00:00Z',
        latestId: 'b',
      },
      {
        personalityType: '내일의 나를 준비하는 사람',
        count: 2,
        startedAt: '2026-07-29T00:00:00Z',
        latestId: 'd',
      },
    ]);
  });

  it('떨어져서 다시 나온 성향은 따로 묶는다', () => {
    const runs = groupTasteHistory([
      { ...HISTORY[0], id: '3', personality_type: 'A' },
      { ...HISTORY[1], id: '2', personality_type: 'B' },
      { ...HISTORY[2], id: '1', personality_type: 'A' },
    ]);
    expect(runs.map((r) => r.personalityType)).toEqual(['A', 'B', 'A']);
  });

  it('빈 이력은 빈 배열', () => {
    expect(groupTasteHistory([])).toEqual([]);
  });
});
