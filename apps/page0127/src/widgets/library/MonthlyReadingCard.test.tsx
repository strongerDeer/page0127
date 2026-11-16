import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { MonthlyReadingCard, summarizeMonths } from './MonthlyReadingCard';

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

  it('올해면 이번 달 권수·지난달과 함께, 지난해면 책을 읽은 달 수를 보여 준다', () => {
    const counts = [2, 2, 1, 2, 3, 0, 1, 1, 1, 3, 2, 0];
    const thisYear = renderToStaticMarkup(
      <MonthlyReadingCard
        year={2026}
        counts={counts}
        thisMonth={11}
        onSelect={() => {}}
      />
    );
    expect(thisYear).toContain('이번 달');
    expect(thisYear).toContain('지난달 3권');

    const pastYear = renderToStaticMarkup(
      <MonthlyReadingCard year={2025} counts={counts} onSelect={() => {}} />
    );
    expect(pastYear).toContain('책을 읽은 달');
    expect(pastYear).not.toContain('이번 달');
  });
});

describe('summarizeMonths', () => {
  it('가장 많이 읽은 달이 여럿이면 함께 · 월 평균은 이번 달까지만 나눈다', () => {
    const counts = [2, 2, 1, 2, 3, 0, 1, 1, 1, 3, 2, 0];
    expect(summarizeMonths(counts, 11)).toMatchObject({
      peak: '5·10월',
      peakUnit: '3권',
      average: '1.6', // 18권 ÷ 11달
      activeMonths: 10,
    });
    expect(summarizeMonths(counts).average).toBe('1.5'); // 지난해 — 18 ÷ 12
  });

  it('셋 넘게 같으면 "외"로 줄이고, 0권이면 대시', () => {
    expect(summarizeMonths(Array(12).fill(1)).peak).toBe('1·2월 외');
    expect(summarizeMonths(Array(12).fill(0))).toMatchObject({
      peak: '—',
      peakUnit: undefined,
      average: '0',
    });
  });
});
