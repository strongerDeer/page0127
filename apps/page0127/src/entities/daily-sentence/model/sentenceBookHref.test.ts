import { describe, expect, it } from 'vitest';

import { sentenceBookHref } from './sentenceBookHref';

describe('sentenceBookHref', () => {
  it('도서 정보에 있는 책이면 도서 정보 화면으로', () => {
    expect(
      sentenceBookHref({ isbn: '9788937460449', book_title: '이방인' }, 'abc')
    ).toBe('/books/info/abc');
  });

  it('없으면 ISBN·제목으로 담기 화면을 연다', () => {
    expect(
      sentenceBookHref({ isbn: '9788937460449', book_title: '이방인' }, null)
    ).toBe('/books/add?isbn=9788937460449&title=%EC%9D%B4%EB%B0%A9%EC%9D%B8');
  });

  it('ISBN 도 없으면 링크가 없다', () => {
    expect(sentenceBookHref({ isbn: null, book_title: '이방인' }, null)).toBe(
      null
    );
  });
});
