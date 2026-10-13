import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { BookFeedGrid } from './BookFeedGrid';

describe('BookFeedGrid', () => {
  it('인생책 카드만 금빛(chart-4) 테두리로 강조한다', () => {
    const life = createTestBook({ title: '인생책', is_life_book: true });
    const plain = createTestBook({ title: '보통 책' });
    const html = renderToStaticMarkup(
      <BookFeedGrid
        books={[life, plain]}
        rankMap={new Map()}
        bookHref={(b) => `/me/${b.id}`}
      />
    );
    expect((html.match(/var\(--chart-4\)/g) ?? []).length).toBe(1);
  });
});
