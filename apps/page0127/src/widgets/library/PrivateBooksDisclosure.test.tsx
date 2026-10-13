import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { createTestBook } from '@/entities/book/model/createTestBook';

import { PrivateBooksDisclosure } from './PrivateBooksDisclosure';

describe('PrivateBooksDisclosure', () => {
  it('비공개 책이 없으면 아무것도 그리지 않는다', () => {
    expect(
      renderToStaticMarkup(<PrivateBooksDisclosure books={[]} username='me' />)
    ).toBe('');
  });

  it('권수와 "방문자에게는 안 보여요"를 보여 주고, 처음엔 접혀 있다', () => {
    const books = [
      createTestBook({ is_public: false, title: '비밀 책 A' }),
      createTestBook({ is_public: false, title: '비밀 책 B' }),
    ];
    const html = renderToStaticMarkup(
      <PrivateBooksDisclosure books={books} username='me' />
    );
    expect(html).toContain('나만 보는 비공개 책');
    expect(html).toContain('2권');
    expect(html).toContain('방문자에게는 안 보여요');
    expect(html).toContain('aria-expanded="false"');
    // 접힌 상태에서는 책장을 그리지 않는다
    expect(html).not.toContain('비밀 책 A');
  });
});
