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

  it('인생책은 아래 명패 띠가 틸(chart-6) "인생책"으로 바뀐다 — 위쪽 번호(BOOK #001)와 겹치지 않게', () => {
    const life = createTestBook({ title: '인생책 후보', is_life_book: true });
    const plain = createTestBook({ title: '보통 책' });
    const html = render([life, plain]);

    expect((html.match(/data-life-badge/g) ?? []).length).toBe(1);
    // 뱃지 안 글자가 "인생책" (아이콘 svg 다음)
    expect(html).toMatch(
      /data-life-badge[^>]*>(?:<svg[\s\S]*?<\/svg>)?인생책</
    );
    // 띠는 번호 블록보다 뒤에 온다 = 카드 아래쪽
    expect(html.indexOf('data-life-badge')).toBeGreaterThan(
      html.indexOf('#001')
    );
    // 보통 책의 띠는 그대로 page0127.
    expect(html).toContain('page0127.');
    // 굵은 노란 테두리(chart-4)는 쓰지 않는다
    expect(html).not.toContain('var(--chart-4)');
  });

  it('인생책 글씨는 틸 위에서 읽히는 진한 남색 — 흰 글씨는 대비 2.5:1 로 모자란다', () => {
    const html = render([createTestBook({ is_life_book: true })]);
    const badge = html.slice(html.indexOf('data-life-badge'));
    expect(badge.slice(0, badge.indexOf('>'))).toContain('--navy-900');
    expect(badge.slice(0, badge.indexOf('>'))).not.toContain('text-white');
  });

  it('테두리는 맨 위 겹침 층으로 그린다 — 인라인 box-shadow 는 hover 그림자를 지우고 아래 띠에 가린다', () => {
    const html = render([createTestBook({ is_life_book: true })]);
    expect(html).not.toContain('box-shadow');
    expect(html).toContain('data-life-ring');
  });
});
