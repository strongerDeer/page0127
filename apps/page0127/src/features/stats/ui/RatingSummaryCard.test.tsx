import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { RatingSummaryCard } from './RatingSummaryCard';

const ratings = [
  { rating: 5, is_life_book: true, count: 1, fill: '' },
  { rating: 5, is_life_book: false, count: 2, fill: '' },
  { rating: 3, is_life_book: false, count: 9, fill: '' },
  { rating: 0, is_life_book: false, count: 4, fill: '' },
];

const render = (lifeBooks: ReturnType<typeof createTestBook>[]) =>
  renderToStaticMarkup(
    <RatingSummaryCard
      year={2026}
      ratings={ratings}
      averageRating={3.2}
      total={14}
      lifeBooks={lifeBooks}
      bookHref={(b) => `/me/${b.id}`}
      onRatingClick={() => {}}
    />
  );

describe('RatingSummaryCard', () => {
  it('분포(0점 제외)와 올해의 인생책', () => {
    const html = render([
      createTestBook({
        title: '데이터 삽질 끝에 UX가 보였다',
        is_life_book: true,
        completed_date: '2026-05-08',
      }),
    ]);
    expect(html).toContain('평균 3.2 · 14권');
    expect(html).toContain('인생책');
    expect(html).not.toContain('0점');
    expect(html).toContain('2026 인생책');
    expect(html).toContain('데이터 삽질 끝에 UX가 보였다');
  });

  it('인생책 막대는 틸(chart-6) — 브랜드 블루와 어울리는 에메랄드 계열', () => {
    const html = render([]);
    expect(html).toContain('background-color:var(--chart-6)');
    expect(html).not.toContain('var(--chart-4)');
  });

  it('인생책이 없으면 그 칸을 그리지 않는다', () => {
    expect(render([])).not.toContain('2026 인생책');
  });
});
