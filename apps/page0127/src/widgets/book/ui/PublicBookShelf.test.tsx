import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';
import { spineWidthPx } from '@/entities/book/model/spineWidth';

import { PublicBookShelf } from './PublicBookShelf';

import type { Book } from '@/entities/book';

/**
 * 책등 이미지는 **높이만 고정하고 폭은 원본 비율에 맡긴다.**
 *
 * 2026-09-29 두께(thickness_mm)로 책등 폭을 고정했다가 두 번 되돌렸다.
 * 두께에서 만든 폭(32~64px)이 스캔의 자연 폭(12~27px)보다 넓어서
 * - `object-fit: cover` → 위아래가 잘려 제목이 반쯤 사라졌다(평균 55% 손실)
 * - `object-fit: fill`  → 글자가 옆으로 늘어났다(평균 2.27배)
 * 비율을 지키려면 이미지에 폭을 강제하지 않는 수밖에 없다. 그 사실을 잠근다.
 */

const makeBook = (overrides: Partial<Book>): Book =>
  ({
    id: 'b1',
    title: '소년이 온다',
    cover_image: 'https://example.com/cover.jpg',
    spine_image: 'https://example.com/spine.jpg',
    thickness_mm: 20,
    read_count: 1,
    rating: null,
    is_life_book: false,
    ...overrides,
  }) as Book;

const findImg = (html: string) => html.match(/<img[^>]*>/)?.[0] ?? '';

describe('PublicBookShelf 책등', () => {
  it('책등 이미지에 폭·object-fit 을 강제하지 않는다 — 늘어나거나 잘리지 않게', () => {
    const img = findImg(
      renderToStaticMarkup(<PublicBookShelf books={[makeBook({})]} />)
    );

    expect(img).toContain('src=');
    // next/image 가 기본으로 넣는 style 은 color 뿐이다. width·object-fit 이
    // 인라인으로 들어가면 CSS 의 `width: auto` 를 이겨 비율이 깨진다.
    expect(img).not.toMatch(/style="[^"]*width/);
    expect(img).not.toMatch(/object-fit/);
  });

  it('책등 이미지가 없는 책은 두께로 폭을 만든다 — 늘어날 이미지가 없으니 안전하다', () => {
    const html = renderToStaticMarkup(
      <PublicBookShelf books={[makeBook({ spine_image: null })]} />
    );

    expect(html).toContain(`width:${spineWidthPx(20)}px`);
  });
});

// 위 makeBook 은 id 가 'b1' 고정이라 두 권 이상이면 key 가 겹친다 → 여기선 createTestBook
describe('PublicBookShelf — 책장 강화', () => {
  it('읽는 중인 책은 선반 끝에 책갈피와 함께, 접근명에 "읽는 중"', () => {
    const done = createTestBook({ title: '다 읽은 책' });
    const reading = createTestBook({
      title: '읽고 있는 책',
      status: 'reading',
    });
    const html = renderToStaticMarkup(
      <PublicBookShelf
        books={[done]}
        readingBooks={[reading]}
        username='me'
        compact
      />
    );
    expect(html.indexOf('다 읽은 책')).toBeLessThan(
      html.indexOf('읽고 있는 책')
    );
    expect(html).toContain('data-bookmark');
    expect(html).toContain('aria-label="읽고 있는 책 (읽는 중)"');
  });

  it('책마다 제목 말풍선, 명판은 장식', () => {
    const html = renderToStaticMarkup(
      <PublicBookShelf
        books={[createTestBook({ title: '말풍선 책', rating: 3 })]}
        plateLabel='2026'
        username='me'
        compact
      />
    );
    expect(html).toContain('role="tooltip"');
    expect(html).toContain('말풍선 책 · 3점');
    expect(html).toMatch(/aria-hidden="true"[^>]*>2026</);
  });

  it('왼쪽부터 채운다 — 가운데 정렬로 몰지 않는다', () => {
    const html = renderToStaticMarkup(
      <PublicBookShelf books={[createTestBook()]} username='me' />
    );
    expect(html).toContain('data-align="start"');
  });
});
