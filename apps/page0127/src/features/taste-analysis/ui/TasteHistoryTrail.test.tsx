import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { TasteHistoryTrail } from './TasteHistoryTrail';

// 최신순 — 한 우물 ×2(7월) → 내일의 나 ×1(10월)
const HISTORY = [
  {
    id: 'c',
    personality_type: '내일의 나를 준비하는 사람',
    created_at: '2026-10-20T00:00:00Z',
  },
  {
    id: 'b',
    personality_type: '한 우물을 깊이 파는 사람',
    created_at: '2026-07-20T00:00:00Z',
  },
  {
    id: 'a',
    personality_type: '한 우물을 깊이 파는 사람',
    created_at: '2026-07-10T00:00:00Z',
  },
];

describe('TasteHistoryTrail', () => {
  it('같은 성향은 한 뱃지 + ×N, 보고 있는 회차의 묶음에 aria-current', () => {
    const html = renderToStaticMarkup(
      <TasteHistoryTrail history={HISTORY} currentId='a' />
    );
    expect(html).toContain('×2');
    // 'a' 는 첫 묶음(최신 회차 b 로 링크)에 속한다
    expect(html).toMatch(
      /aria-current="page"[^>]*href="\/dashboard\/taste-analysis\/b"/
    );
    expect(html.match(/aria-current/g)).toHaveLength(1);
  });

  it('성향이 한 가지뿐이면 그리지 않는다', () => {
    expect(
      renderToStaticMarkup(
        <TasteHistoryTrail history={HISTORY.slice(1)} currentId='a' />
      )
    ).toBe('');
  });
});
