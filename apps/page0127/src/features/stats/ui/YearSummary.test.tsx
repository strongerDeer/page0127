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

  it('칸 수가 홀수면 마지막 칸이 모바일에서 한 줄을 다 쓴다 — 2열에 혼자 반 칸으로 남지 않게', () => {
    // 4칸(쪽·시간·달·평점) → 짝수, 늘이지 않는다
    expect(render()).not.toContain('col-span-2');
    // 쪽수 0 → 달·평점 2칸, 짝수
    expect(render({ totalPages: 0 })).not.toContain('col-span-2');
    // 쪽수는 있고 많이 읽은 달이 없으면 → 쪽·시간·평점 3칸, 마지막(평점)만
    const three = render({
      monthlyReading: monthly.map((m) => ({ ...m, count: 0 })),
    });
    expect((three.match(/col-span-2/g) ?? []).length).toBe(1);
    expect(three).toMatch(
      /class="[^"]*col-span-2 sm:col-span-1[^"]*"><p[^>]*>3\.2점</
    );
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

  it('0권이면 "— · 인생책 0권" 칸을 그리지 않는다 — 빈 성적표가 된다', () => {
    const html = render({
      completed: 0,
      totalPages: 0,
      averageRating: 0,
      lifeBookCount: 0,
      monthlyReading: monthly.map((m) => ({ ...m, count: 0 })),
    });
    expect(html).not.toContain('평균 평점');
    expect(html).not.toContain('data-facts');
  });

  it('달성 공유 버튼은 올해 목표를 채웠을 때만 보인다', () => {
    const share = <button type='button'>달성 공유하기</button>;
    // 14/40 — 아직
    expect(render({ goalShare: share })).not.toContain('달성 공유하기');
    // 40/40 — 달성
    expect(render({ goalShare: share, completed: 40 })).toContain(
      '달성 공유하기'
    );
    // 지난해 달성은 그리지 않는다 — 이미지는 올해 목표만 그린다
    expect(
      render({ goalShare: share, completed: 40, year: 2025 })
    ).not.toContain('달성 공유하기');
  });
});
