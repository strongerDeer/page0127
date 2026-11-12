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
    expect(html).toContain('aria-label="10월 13일, 오늘, 1권 완독"');
    // 요약은 "10월 <b>1권</b> 완독 · 300쪽" — 굵은 글씨 태그 때문에 나눠서 본다
    expect(html).toContain('>1권</b> 완독 · 300쪽');
  });

  it('view 를 주면 그 달을 그린다 — 부모가 상태를 들고 있는 제어 모드', () => {
    const html = renderToStaticMarkup(
      <ReadingCalendar
        books={[createTestBook({ completed_date: '2026-03-05' })]}
        year={2026}
        today='2026-10-13'
        isOwner={false}
        bookHref={href}
        view={{ year: 2026, month: 3 }}
        onViewChange={() => {}}
      />
    );
    expect(html).toContain('2026년 3월');
    expect(html).toContain('aria-label="3월, 완독 있음"');
  });

  it('initialMonth 가 오면 그 달로 연다', () => {
    const html = renderToStaticMarkup(
      <ReadingCalendar
        books={[createTestBook({ completed_date: '2026-10-13' })]}
        year={2026}
        today='2026-10-13'
        isOwner={false}
        bookHref={href}
        initialMonth={5}
      />
    );
    expect(html).toContain('2026년 5월');
  });

  it('주인 화면의 비공개 책은 반투명이고 완독에 함께 세며 그중 권수를 따로 적는다', () => {
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
    expect(html).toContain('>1권</b> 완독 · 100쪽 · 그중 나만 보기 1권');
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

describe('ReadingCalendar · 그날 패널 (B안)', () => {
  const sentence = {
    draw_date: '2026-10-12',
    sentence_id: 's1',
    text: '어제 펼친 문장',
    book_title: '어제의 책',
    author: null,
    translator: null,
    page: null,
    isbn: null,
    cover_image: null,
  };

  it('처음엔 오늘 칸이 골라져 있고 오늘 자리(todaySlot)와 아래 칸(footerSlot)을 그린다', () => {
    const html = renderToStaticMarkup(
      <ReadingCalendar
        books={[]}
        year={2026}
        today='2026-10-13'
        isOwner
        bookHref={href}
        todaySlot={<p>오늘의 문장 펼치기</p>}
        footerSlot={<p>내가 모은 문장 한 줄</p>}
      />
    );
    expect(html).toContain('10월 13일 · 오늘');
    expect(html).toContain('오늘의 문장 펼치기');
    expect(html).toContain('내가 모은 문장 한 줄');
    // 책이 없어도 오늘 칸은 누를 수 있다(펼치기 자리)
    expect(html).toMatch(
      /<button type="button" aria-pressed="true" aria-label="10월 13일, 오늘"/
    );
  });

  it('문장을 펼친 지난날은 책갈피를 꽂고 누를 수 있다', () => {
    const html = renderToStaticMarkup(
      <ReadingCalendar
        books={[]}
        year={2026}
        today='2026-10-13'
        isOwner
        bookHref={href}
        sentenceDraws={[sentence]}
      />
    );
    expect(html).toContain('aria-label="10월 12일, 오늘의 문장"');
  });

  it('오늘 자리가 없으면(풀이 빈 서재·방문자) 기록이 없다고 알린다', () => {
    const html = renderToStaticMarkup(
      <ReadingCalendar
        books={[]}
        year={2026}
        today='2026-10-13'
        isOwner={false}
        bookHref={href}
      />
    );
    expect(html).toContain('오늘은 아직 기록이 없어요.');
  });
});
