import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { YearSummary } from './YearSummary';

const monthly = Array.from({ length: 12 }, (_, i) => ({
  month: i + 1,
  count: i === 4 ? 3 : 1,
}));

const render = (overrides: Partial<Parameters<typeof YearSummary>[0]> = {}) =>
  renderToStaticMarkup(
    <YearSummary
      year={2026}
      today='2026-10-13'
      completed={14}
      target={40}
      totalPages={4352}
      averageRating={3.2}
      lifeBookCount={1}
      monthlyReading={monthly}
      isOwner
      {...overrides}
    />
  );

describe('YearSummary', () => {
  it('완독 권수가 가장 큰 숫자, 한마디와 환산 카드', () => {
    const html = render();
    expect(html).toContain('2026년에 완독한 책');
    expect(html).toContain('>14<');
    expect(html).toContain('지금 속도면 올해 약 18권');
    expect(html).toContain('약 22cm'); // 4352 ÷ 200
    expect(html).toContain('약 73시간'); // 4352 ÷ 60, 1분/쪽
    expect(html).toContain('영화 36편');
    expect(html).toContain('5월'); // 가장 많이 읽은 달
    expect(html).toContain('3.2점');
  });

  it('환산 칸은 같은 폭 격자 — 글자 길이대로 들쭉날쭉하지 않게(모바일 2열, 넓으면 한 줄 등분)', () => {
    const html = render();
    expect(html).toContain('data-facts');
    expect(html).toMatch(/data-facts[^>]*class="[^"]*grid grid-cols-2/);
    expect(html).toMatch(/data-facts[^>]*class="[^"]*sm:auto-cols-fr/);
  });

  it('목표가 있으면 진행률과 오늘 기준 눈금', () => {
    const html = render();
    expect(html).toContain('목표 40권 · 35%');
    expect(html).toContain('data-pace-marker');
  });

  it('목표가 없으면 막대 대신 주인에게 목표 정하기', () => {
    const html = render({ target: 0, onSetGoal: () => {} });
    expect(html).not.toContain('data-pace-marker');
    expect(html).toContain('목표 정하기');
  });

  it('방문자에게는 목표 버튼이 없다', () => {
    const html = render({ isOwner: false, onSetGoal: undefined });
    expect(html).not.toContain('목표 수정');
    expect(html).not.toContain('목표 정하기');
  });

  it('쪽수를 모르면(0쪽) 높이·시간 환산을 보여 주지 않는다 — "0cm · 영화 0편"은 의미가 없다', () => {
    const html = render({ totalPages: 0 });
    expect(html).not.toContain('쌓으면');
    expect(html).not.toContain('영화');
    expect(html).toContain('가장 많이 읽은 달');
  });

  it('완독 0권이면 가장 많이 읽은 달을 보여 주지 않는다', () => {
    const html = render({
      completed: 0,
      totalPages: 0,
      monthlyReading: monthly.map((m) => ({ ...m, count: 0 })),
    });
    expect(html).not.toContain('가장 많이 읽은 달');
  });
});
