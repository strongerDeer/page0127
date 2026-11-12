import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { MonthlyReadingCard } from './MonthlyReadingCard';

describe('MonthlyReadingCard', () => {
  it('달마다 권수 막대 버튼 12개 · 가장 많이 읽은 달이 100% · 합계', () => {
    const counts = [2, 0, 4, 0, 0, 0, 0, 0, 0, 1, 0, 0];
    const html = renderToStaticMarkup(
      <MonthlyReadingCard
        year={2026}
        counts={counts}
        selectedMonth={10}
        onSelect={() => {}}
      />
    );
    expect((html.match(/data-month-bar/g) ?? []).length).toBe(12);
    expect(html).toContain('aria-label="3월, 4권 — 캘린더에서 보기"');
    expect(html).toContain('height:100%');
    expect(html).toContain('2026년 7권');
  });

  it('캘린더가 다른 해를 보고 있으면 아무 막대도 눌린 상태가 아니다', () => {
    const html = renderToStaticMarkup(
      <MonthlyReadingCard
        year={2026}
        counts={Array(12).fill(1)}
        onSelect={() => {}}
      />
    );
    expect(html).not.toContain('aria-pressed="true"');
  });
});
