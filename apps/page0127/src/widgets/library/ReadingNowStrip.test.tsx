import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { ReadingNowStrip } from './ReadingNowStrip';

const href = (book: { id: string }) => `/me/${book.id}`;

describe('ReadingNowStrip', () => {
  it('읽는 책이 없으면 그리지 않는다', () => {
    expect(
      renderToStaticMarkup(<ReadingNowStrip books={[]} bookHref={href} />)
    ).toBe('');
  });

  it('한 줄 — 제목 옆에 시작일(M/D~)', () => {
    const html = renderToStaticMarkup(
      <ReadingNowStrip
        books={[
          createTestBook({
            title: '대온실 수리 보고서',
            status: 'reading',
            start_date: '2026-10-02',
          }),
          createTestBook({ title: '손절사회', status: 'reading' }),
        ]}
        bookHref={href}
      />
    );
    expect(html).toContain('지금 읽는 중');
    expect(html).toContain('10/2~');
    // 시작일이 없는 책은 날짜를 만들지 않는다
    expect((html.match(/~</g) ?? []).length).toBe(1);
  });
});
