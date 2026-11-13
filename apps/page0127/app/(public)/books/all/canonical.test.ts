import { describe, expect, it } from 'vitest';

import { getBooksAllCanonical } from './canonical';

describe('getBooksAllCanonical', () => {
  it('1페이지는 /books/all 이다', () => {
    expect(getBooksAllCanonical({})).toBe('/books/all');
    expect(getBooksAllCanonical({ page: '1' })).toBe('/books/all');
  });

  it('2페이지 이상은 자기 페이지 주소를 canonical 로 쓴다', () => {
    expect(getBooksAllCanonical({ page: '2' })).toBe('/books/all?page=2');
    expect(getBooksAllCanonical({ page: '9' })).toBe('/books/all?page=9');
  });

  it('정렬 파라미터는 버리고 기본 정렬 주소로 모은다', () => {
    expect(
      getBooksAllCanonical({ page: '3', sort: 'title', order: 'asc' })
    ).toBe('/books/all?page=3');
  });

  it('검색 결과는 페이지와 상관없이 /books/all 로 모은다', () => {
    expect(getBooksAllCanonical({ q: '데미안', page: '2' })).toBe('/books/all');
  });

  it('공백뿐인 검색어는 검색이 아닌 것으로 본다', () => {
    expect(getBooksAllCanonical({ q: '   ', page: '2' })).toBe(
      '/books/all?page=2'
    );
  });

  it('잘못된 page 값은 1페이지로 본다', () => {
    for (const page of ['abc', '0', '-1', '2.5', '']) {
      expect(getBooksAllCanonical({ page })).toBe('/books/all');
    }
  });

  it('page 가 여러 개면 첫 값만 본다', () => {
    expect(getBooksAllCanonical({ page: ['4', '5'] })).toBe(
      '/books/all?page=4'
    );
  });
});
