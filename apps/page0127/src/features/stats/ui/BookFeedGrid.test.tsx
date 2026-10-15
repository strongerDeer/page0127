import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { BookFeedGrid } from './BookFeedGrid';

describe('BookFeedGrid', () => {
  const render = (books: ReturnType<typeof createTestBook>[]) =>
    renderToStaticMarkup(
      <BookFeedGrid
        books={books}
        rankMap={new Map(books.map((b, i) => [b.id, i + 1]))}
        bookHref={(b) => `/me/${b.id}`}
      />
    );

  it('인생책은 틸(chart-6) 테두리로만 — "인생책" 글자는 붙이지 않고 아래 띠도 그대로 page0127. (사용자 결정 10/15)', () => {
    const life = createTestBook({ title: '최고의 책', is_life_book: true });
    const plain = createTestBook({ title: '보통 책' });
    const html = render([life, plain]);

    expect((html.match(/data-life-ring/g) ?? []).length).toBe(1);
    expect(html).toContain('var(--chart-6)');
    // 화면에는 "인생책" 글자가 없고, 화면낭독기 전용 글자로만 한 번
    expect((html.match(/인생책/g) ?? []).length).toBe(1);
    expect(html).toMatch(/<span class="sr-only">인생책<\/span>/);
    // 두 카드 모두 아래 띠는 page0127.
    expect((html.match(/page0127\./g) ?? []).length).toBe(2);
    // 굵은 노란 테두리(chart-4)는 쓰지 않는다
    expect(html).not.toContain('var(--chart-4)');
  });

  it('테두리는 맨 위 겹침 층으로 그린다 — 인라인 box-shadow 는 hover 그림자를 지우고 아래 띠에 가린다', () => {
    const html = render([createTestBook({ is_life_book: true })]);
    expect(html).not.toContain('box-shadow');
    expect(html).toContain('data-life-ring');
  });
});
