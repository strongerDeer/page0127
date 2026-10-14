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

  const render = () =>
    renderToStaticMarkup(
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

  it('표지를 크게(56×84), 제목은 말풍선으로만 — 시작일은 말풍선 안(M/D~)', () => {
    const html = render();
    expect(html).toContain('지금 읽는 중');
    expect(html).toContain('h-21 w-14');
    expect((html.match(/role="tooltip"/g) ?? []).length).toBe(2);
    expect(html).toMatch(/role="tooltip"[^>]*>대온실 수리 보고서 · 10\/2~</);
    // 시작일이 없는 책은 날짜를 만들지 않는다
    expect((html.match(/~</g) ?? []).length).toBe(1);
  });

  it('제목이 화면에 상시 보이지 않아도 링크 이름으로는 읽힌다', () => {
    const html = render();
    expect(html).toContain('aria-label="대온실 수리 보고서, 10/2부터 읽는 중"');
    expect(html).toContain('aria-label="손절사회, 읽는 중"');
  });
});
