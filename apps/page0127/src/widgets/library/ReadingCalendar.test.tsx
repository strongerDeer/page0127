import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { ReadingCalendar } from './ReadingCalendar';

const href = (book: { id: string }) => `/me/${book.id}`;

describe('ReadingCalendar', () => {
  it('이번 달 · 월 칩 12개 · 완독 표지 · 요약', () => {
    const book = createTestBook({
      title: '모든 것이 되는 법',
      completed_date: '2026-10-13',
      page_count: 300,
    });
    const html = renderToStaticMarkup(
      <ReadingCalendar
        books={[book]}
        year={2026}
        today='2026-10-13'
        isOwner={false}
        bookHref={href}
      />
    );
    expect(html).toContain('2026년 10월');
    expect((html.match(/data-month-chip/g) ?? []).length).toBe(12);
    expect(html).toContain('aria-label="10월 13일, 1권 완독"');
    // 요약은 "10월 <b>1권</b> 완독 · 300쪽" — 굵은 글씨 태그 때문에 나눠서 본다
    expect(html).toContain('>1권</b> 완독 · 300쪽');
  });

  it('주인 화면의 비공개 책은 반투명이고 요약 뒤에 따로 센다', () => {
    const html = renderToStaticMarkup(
      <ReadingCalendar
        books={[
          createTestBook({ completed_date: '2026-10-05', is_public: false }),
        ]}
        year={2026}
        today='2026-10-13'
        isOwner
        bookHref={href}
      />
    );
    expect(html).toContain('opacity-50');
    expect(html).toContain('>0권</b> 완독 · 비공개 1권');
  });

  it('방문자 화면에는 비공개 권수 문구가 없다', () => {
    const html = renderToStaticMarkup(
      <ReadingCalendar
        books={[createTestBook({ completed_date: '2026-10-05' })]}
        year={2026}
        today='2026-10-13'
        isOwner={false}
        bookHref={href}
      />
    );
    expect(html).not.toContain('비공개');
  });

  it('지난해 탭이면 그 해 마지막 완독 달로 연다', () => {
    const html = renderToStaticMarkup(
      <ReadingCalendar
        books={[createTestBook({ completed_date: '2025-11-29' })]}
        year={2025}
        today='2026-10-13'
        isOwner={false}
        bookHref={href}
      />
    );
    expect(html).toContain('2025년 11월');
  });
});

describe('ReadingCalendar · 읽는 중', () => {
  it('시작일 칸에 표지를 점선으로 놓고 읽기 시작으로 읽어 준다', () => {
    const html = renderToStaticMarkup(
      <ReadingCalendar
        books={[
          createTestBook({ status: 'reading', start_date: '2026-10-08' }),
        ]}
        year={2026}
        today='2026-10-22'
        isOwner={false}
        bookHref={href}
      />
    );
    expect(html).toContain('aria-label="10월 8일, 1권 읽기 시작"');
    expect(html).toContain('dashed');
  });
});
