import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { RenderWhenNear } from '@/shared/ui/RenderWhenNear';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { BookListItem } from './BookListItem';

/**
 * 첫 화면 밖 표지는 서버 HTML 에 이미지 태그가 아예 없어야 한다.
 * 태그가 있으면 크롬이 lazy 라도 1250~2500px 앞까지 미리 받아 첫 표지(LCP)와
 * 대역폭을 다툰다(2026-11-23 전체 도서). 그 약속을 잠근다.
 */
const book = createTestBook({
  id: 'b1',
  title: '소년이 온다',
  cover_image: 'https://example.com/cover.jpg',
});

type CoverProps = Parameters<typeof BookListItem.Cover>[0];

const render = (props: Partial<CoverProps>) =>
  renderToStaticMarkup(
    <BookListItem.Cover
      id={book.id}
      href='/books/info/b1'
      title={book.title}
      author={book.author}
      cover={book.cover_image}
      spine={null}
      description={null}
      publisher={null}
      category={null}
      isRead={false}
      {...props}
    />
  );

describe('전체 도서 표지 늦게 받기', () => {
  it('deferOffscreenCover 면 첫 화면 밖 표지는 자리만 잡고 이미지 태그가 없다', () => {
    const html = render({ deferOffscreenCover: true });
    expect(html).toContain('data-cover-placeholder');
    expect(html).not.toContain('alt="소년이 온다"');
  });

  it('첫 화면 표지(priority)는 늦추지 않는다', () => {
    const html = render({ deferOffscreenCover: true, priority: true });
    expect(html).not.toContain('data-cover-placeholder');
    expect(html).toContain('alt="소년이 온다"');
  });

  it('옵션을 켜지 않은 목록은 그대로 이미지 태그를 그린다', () => {
    const html = render({});
    expect(html).not.toContain('data-cover-placeholder');
    expect(html).toContain('alt="소년이 온다"');
  });

  it('표지가 없는 책은 늦출 것이 없다 — 조판 표지를 바로 그린다', () => {
    const html = render({
      title: '빈 표지',
      cover: null,
      deferOffscreenCover: true,
    });
    expect(html).not.toContain('data-cover-placeholder');
    expect(html).toContain('빈 표지');
  });
});

describe('RenderWhenNear', () => {
  it('서버 HTML 에는 자리 표시만 나간다(차트 청크를 첫 로드에 받지 않는다)', () => {
    const html = renderToStaticMarkup(
      <RenderWhenNear className='h-[300px]' placeholder={<i>자리</i>}>
        <b>차트</b>
      </RenderWhenNear>
    );
    expect(html).toContain('자리');
    expect(html).not.toContain('차트');
  });
});
