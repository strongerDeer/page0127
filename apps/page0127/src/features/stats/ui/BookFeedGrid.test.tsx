import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { BookFeedGrid } from './BookFeedGrid';

describe('BookFeedGrid', () => {
  it('인생책 카드만 틸(chart-6) "인생책" 뱃지와 얇은 안쪽 테두리로 강조한다', () => {
    const life = createTestBook({ title: '인생책 후보', is_life_book: true });
    const plain = createTestBook({ title: '보통 책' });
    const html = renderToStaticMarkup(
      <BookFeedGrid
        books={[life, plain]}
        rankMap={new Map()}
        bookHref={(b) => `/me/${b.id}`}
      />
    );
    expect((html.match(/data-life-badge/g) ?? []).length).toBe(1);
    expect(html).toMatch(
      /data-life-badge[^>]*>[^<]*<[^>]*>[^<]*인생책|인생책</
    );
    expect(html).toContain('var(--chart-6)');
    // 굵은 노란 테두리(chart-4)는 쓰지 않는다
    expect(html).not.toContain('var(--chart-4)');
  });
});
